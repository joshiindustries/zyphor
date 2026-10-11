import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";

const TASKS_VERSION = "0.10.22-rc.20250304";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** Local face-count signal only. No frames or identity data are sent to Zyphor. */
export default function MediaPipeMonitor({ attemptId, session, policy = {} }) {
  const video = useRef(null);
  const stream = useRef(null);
  const landmarker = useRef(null);
  const sentAt = useRef({});
  const alertCount = useRef(0);
  const [state, setState] = useState("Requesting camera…");
  const [faceCount, setFaceCount] = useState(null);

  useEffect(() => {
    let live = true;
    let monitoringEnabled = true;
    let raf = 0;
    let lastFrame = 0;
    let noFaceSince = 0;
    let multiFaceSince = 0;
    let lastCameraStatus = 0;
    const headers = { headers: { "X-Exam-Session": session } };
    const report = (type, details = {}) => {
      const now = Date.now();
      if (now - (sentAt.current[type] || 0) < 5000) return false;
      sentAt.current[type] = now;
      api("POST", `/api/zyphor/integrations/attempts/${attemptId}/monitoring`, { type, details }, headers)
        .catch(() => {});
      return true;
    };

    async function start() {
      try {
        const granted = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (!live || !monitoringEnabled) { granted.getTracks().forEach((track) => track.stop()); return; }
        stream.current = granted;
        video.current.srcObject = stream.current;
        stream.current.getVideoTracks().forEach((track) => track.addEventListener("ended", interrupted));
        await video.current.play();
        setState("Camera ready · initializing local face monitoring");
        const vision = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/vision_bundle.mjs`);
        if (!live || !monitoringEnabled) { stream.current?.getTracks().forEach((track) => track.stop()); return; }
        const files = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`);
        landmarker.current = await vision.FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO", numFaces: 2,
          minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55,
        });
        if (!live || !monitoringEnabled) { landmarker.current.close?.(); landmarker.current = null; stream.current?.getTracks().forEach((track) => track.stop()); return; }
        setState("Monitoring active on this device");
        report("camera_ready", { camera_state: "ready" });
        lastCameraStatus = Date.now();
        const tick = (ts) => {
          if (!live || !monitoringEnabled) return;
          if (ts - lastFrame >= 700 && video.current?.readyState >= 2) {
            lastFrame = ts;
            try {
              const result = landmarker.current.detectForVideo(video.current, ts);
              const count = result.faceLandmarks?.length || 0;
              setFaceCount(count);
              const now = Date.now();
              if (count === 0) {
                noFaceSince ||= now;
                if (now - noFaceSince >= (policy.no_face_seconds || 10) * 1000) {
                  if (report("no_face", { face_count: 0 })) {
                    alertCount.current += 1;
                    setState(alertCount.current >= (policy.warning_limit || 3)
                      ? "Repeated face-visibility alerts · please check the camera view"
                      : "No face visible · alert recorded for review");
                  }
                }
              } else { noFaceSince = 0; setState("Monitoring active on this device"); }
              if (count > 1) {
                multiFaceSince ||= now;
                if (now - multiFaceSince >= (policy.multi_face_seconds || 3) * 1000) {
                  if (report("multiple_faces", { face_count: count })) {
                    alertCount.current += 1;
                    setState(alertCount.current >= (policy.warning_limit || 3)
                      ? "Repeated face-visibility alerts · please check the camera view"
                      : "Multiple faces detected · alert recorded for review");
                  }
                }
              } else multiFaceSince = 0;
            } catch (error) {
              monitoringEnabled = false;
              landmarker.current?.close?.();
              landmarker.current = null;
              stream.current?.getTracks().forEach((track) => track.stop());
              setState("Monitoring paused · model error");
              report("model_error", { error: String(error?.message || "Detection error").slice(0, 160) });
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (error) {
        if (!live) return;
        monitoringEnabled = false;
        landmarker.current?.close?.();
        landmarker.current = null;
        stream.current?.getTracks().forEach((track) => track.stop());
        const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
        setState(denied ? "Camera permission was denied" : "Camera or monitoring service unavailable");
        report(denied ? "camera_denied" : "camera_interrupted", { camera_state: denied ? "denied" : "unavailable" });
      }
    }
    start();
    const switchPoll = setInterval(async () => {
      try {
        const current = await api("GET", `/api/zyphor/integrations/attempts/${attemptId}/status`);
        if (current.mediapipe_enabled && monitoringEnabled && stream.current?.active && Date.now() - lastCameraStatus >= 60000) {
          if (report("camera_ready", { camera_state: "ready" })) lastCameraStatus = Date.now();
        }
        if (!current.mediapipe_enabled && monitoringEnabled) {
          monitoringEnabled = false;
          cancelAnimationFrame(raf);
          landmarker.current?.close?.();
          landmarker.current = null;
          stream.current?.getTracks().forEach((track) => track.stop());
          setState("Monitoring stopped by the exam organizer");
        }
      } catch { /* transient status failure does not interrupt saved exam answers */ }
    }, 8000);
    const interrupted = () => {
      if (!live) return;
      monitoringEnabled = false;
      cancelAnimationFrame(raf);
      landmarker.current?.close?.();
      landmarker.current = null;
      setState("Camera interrupted");
      report("camera_interrupted", { camera_state: "interrupted" });
    };
    return () => {
      live = false;
      clearInterval(switchPoll);
      cancelAnimationFrame(raf);
      landmarker.current?.close?.();
      landmarker.current = null;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, [attemptId, session, policy]);

  return <aside className="card pad-sm" aria-live="polite" style={{ display: "flex", gap: 12, alignItems: "center", margin: "8px 0" }}>
    <video ref={video} muted playsInline aria-label="Local camera preview" style={{ width: 112, height: 78, objectFit: "cover", borderRadius: 8, background: "#111" }} />
    <div><strong>{state}</strong><div className="small muted">Face detection runs locally. No video is recorded or uploaded. Alerts are unverified signals for review.</div>
      {faceCount !== null && <div className="small">Detected faces: {faceCount}</div>}
    </div>
  </aside>;
}
