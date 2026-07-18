"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from "lucide-react";
import { ZyphorWebRTC } from "@/lib/webrtc";
import { withCsrfHeaders } from "@/lib/csrf-client";

export default function CallClient({
  callId,
  sessionUserId,
  isCaller,
  otherUser,
  mediaType,
}: {
  callId: string,
  sessionUserId: string,
  isCaller: boolean,
  otherUser: any,
  mediaType: "AUDIO" | "VIDEO",
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const isVideoCall = mediaType === "VIDEO";

  const [webrtc, setWebrtc] = useState<ZyphorWebRTC | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(isVideoCall);
  const [status, setStatus] = useState("Connecting...");
  const processedSignals = useRef<Set<string>>(new Set());

  useEffect(() => {
    const rtc = new ZyphorWebRTC(async (type, payload) => {
      await fetch("/api/calls/signals", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          call_id: callId,
          type,
          payload
        })
      });
    });

    setWebrtc(rtc);

    rtc.startLocalStream(isVideoCall, true).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setStatus(isCaller ? "Calling..." : "Connecting...");
      setCamOn(stream.getVideoTracks().some((track) => track.enabled));

      if (isCaller) {
        rtc.createOffer();
      }
    }).catch(err => {
      console.error("Failed to start local stream", err);
      setStatus(isVideoCall ? "Camera/Mic access denied" : "Microphone access denied");
    });

    const remoteStream = rtc.getRemoteStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    const pollSignals = async () => {
      try {
        const res = await fetch(`/api/calls/signals?callId=${callId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.signals) {
          for (const signal of data.signals) {
            if (signal.sender_id === sessionUserId || processedSignals.current.has(signal.id)) {
              continue;
            }
            processedSignals.current.add(signal.id);

            const payload = JSON.parse(signal.payload);

            if (signal.type === "OFFER") {
              setStatus("Answering...");
              await rtc.handleOffer(payload);
            } else if (signal.type === "ANSWER") {
              setStatus("Connected");
              await rtc.handleAnswer(payload);
            } else if (signal.type === "ICE_CANDIDATE") {
              await rtc.handleIceCandidate(payload);
            }
          }
        }
      } catch (err) {
        console.error("Signal poll error", err);
      }
    };

    const interval = setInterval(pollSignals, 2000);

    return () => {
      clearInterval(interval);
      rtc.endCall();
    };
  }, [callId, isCaller, isVideoCall, sessionUserId]);

  const toggleMic = () => {
    if (!webrtc) return;
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    const audioTrack = stream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    if (!webrtc || !isVideoCall) return;
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const endCall = async () => {
    if (webrtc) webrtc.endCall();

    await fetch("/api/calls", {
      method: "PATCH",
      headers: withCsrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ call_id: callId, status: "ENDED" })
    });

    window.location.href = "/chat";
  };

  return (
    <main style={{ height: "100vh", background: "#000", position: "relative", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isVideoCall ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ display: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "#fff" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Phone size={48} />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>{otherUser.name}</h1>
            </div>
          </>
        )}

        <div style={{ position: "absolute", top: "2rem", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: "0.5rem 1.5rem", borderRadius: "2rem", color: "#fff", fontWeight: "600", zIndex: 10, backdropFilter: "blur(10px)" }}>
          {status === "Connected" ? `${mediaType === "AUDIO" ? "Audio" : "Video"} call with ${otherUser.name}` : status}
        </div>
      </div>

      {isVideoCall && (
        <div style={{ position: "absolute", bottom: "100px", right: "2rem", width: "200px", height: "300px", borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", background: "#111", zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
          />
        </div>
      )}

      {!isVideoCall && <video ref={localVideoRef} autoPlay playsInline muted style={{ display: "none" }} />}

      <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "1rem", background: "rgba(0,0,0,0.5)", padding: "1rem 2rem", borderRadius: "3rem", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 20 }}>
        <button onClick={toggleMic} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: micOn ? "rgba(255,255,255,0.1)" : "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        {isVideoCall && (
          <button onClick={toggleCam} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: camOn ? "rgba(255,255,255,0.1)" : "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
            {camOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        )}
        <button onClick={endCall} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
          <PhoneOff size={24} />
        </button>
      </div>
    </main>
  );
}