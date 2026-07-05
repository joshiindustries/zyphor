"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { ZyphorWebRTC } from "@/lib/webrtc";

export default function CallClient({ 
  callId, 
  sessionUserId, 
  isCaller, 
  otherUser 
}: { 
  callId: string, 
  sessionUserId: string, 
  isCaller: boolean, 
  otherUser: any 
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [webrtc, setWebrtc] = useState<ZyphorWebRTC | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("Connecting...");
  const processedSignals = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Initialize WebRTC
    const rtc = new ZyphorWebRTC(async (type, payload) => {
      // Send signal to API
      await fetch("/api/calls/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_id: callId,
          type,
          payload
        })
      });
    });

    setWebrtc(rtc);

    // 2. Start local stream
    rtc.startLocalStream(true, true).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setStatus(isCaller ? "Calling..." : "Connecting...");
      
      // If we are the caller, initiate the offer immediately
      if (isCaller) {
        rtc.createOffer();
      }
      
    }).catch(err => {
      console.error("Failed to start local stream", err);
      setStatus("Camera/Mic access denied");
    });

    // 3. Attach remote stream
    const remoteStream = rtc.getRemoteStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    // 4. Polling for signals
    const pollSignals = async () => {
      try {
        const res = await fetch(`/api/calls/signals?callId=${callId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.success && data.signals) {
          for (const signal of data.signals) {
            // Skip signals we sent or already processed
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
  }, [callId, isCaller, sessionUserId]);

  const toggleMic = () => {
    if (!webrtc) return;
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (!webrtc) return;
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    if (webrtc) webrtc.endCall();
    
    // Mark call as ended in DB
    await fetch("/api/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: callId, status: "ENDED" })
    });
    
    window.location.href = "/chat";
  };

  return (
    <main style={{ height: "100vh", background: "#000", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Remote Video (Full Screen) */}
      <div style={{ flex: 1, position: "relative" }}>
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
        
        {/* Status Overlay */}
        <div style={{ position: "absolute", top: "2rem", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: "0.5rem 1.5rem", borderRadius: "2rem", color: "#fff", fontWeight: "600", zIndex: 10, backdropFilter: "blur(10px)" }}>
          {status === "Connected" ? `Talking to ${otherUser.name}` : status}
        </div>
      </div>

      {/* Local Video (PiP) */}
      <div style={{ position: "absolute", bottom: "100px", right: "2rem", width: "200px", height: "300px", borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", background: "#111", zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
        />
      </div>

      {/* Controls */}
      <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "1rem", background: "rgba(0,0,0,0.5)", padding: "1rem 2rem", borderRadius: "3rem", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 20 }}>
        <button onClick={toggleMic} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: micOn ? "rgba(255,255,255,0.1)" : "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button onClick={toggleCam} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: camOn ? "rgba(255,255,255,0.1)" : "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
          {camOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
        <button onClick={endCall} style={{ width: "50px", height: "50px", borderRadius: "50%", border: "none", background: "#e74c3c", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover:scale-105">
          <PhoneOff size={24} />
        </button>
      </div>
    </main>
  );
}
