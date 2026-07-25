"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Phone, Video, X } from "lucide-react";
import { withCsrfHeaders } from "@/lib/csrf-client";

type LiveEvent = {
  id: string;
  kind: "CALL" | "MESSAGE" | "GROUP_MESSAGE";
  title: string;
  body: string;
  link: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  call?: any;
};

type BrowserNotificationOptions = NotificationOptions & {
  badge?: string;
  data?: unknown;
  renotify?: boolean;
  requireInteraction?: boolean;
};

const SEEN_KEY = "zyphor_seen_live_notifications";
const MAX_SEEN = 160;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-MAX_SEEN)));
}

async function showBrowserNotification(event: LiveEvent) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const options: BrowserNotificationOptions = {
    body: event.body,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: event.id,
    renotify: event.kind === "CALL",
    data: { url: event.link },
    requireInteraction: event.kind === "CALL",
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(event.title, options);
      return;
    }
  } catch {
    // Fall back to the page notification API below.
  }

  const notification = new Notification(event.title, options);
  notification.onclick = () => {
    window.focus();
    window.location.href = event.link;
  };
}

export default function LiveNotificationCenter() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [activeCall, setActiveCall] = useState<LiveEvent | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const lastPollRef = useRef(Date.now());
  const initializedRef = useRef(false);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
    }
  }, []);

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const next = await Notification.requestPermission();
    setPermission(next);
  };

  const pollLiveEvents = useCallback(async () => {
    try {
      const since = initializedRef.current ? lastPollRef.current : Date.now() - 5000;
      const res = await fetch(`/api/notifications/live?since=${since}&lookbackSeconds=10&limit=30`, { cache: "no-store" });
      if (res.status === 401) {
        setIsAuthenticated(false);
        setActiveCall(null);
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success) return;
      setIsAuthenticated(true);

      const liveEvents = data.events || [];
      const incomingCall = liveEvents.find((event: LiveEvent) => event.kind === "CALL") || null;
      setActiveCall(incomingCall);

      const seen = readSeen();
      const freshEvents: LiveEvent[] = [];

      for (const event of liveEvents) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        freshEvents.push(event);
      }

      writeSeen(seen);
      if (freshEvents.length > 0) {
        setEvents((current) => [...freshEvents, ...current].slice(0, 4));
        for (const event of freshEvents) {
          await showBrowserNotification(event);
        }
      }

      initializedRef.current = true;
      lastPollRef.current = data.serverTime || Date.now();
    } catch (error) {
      console.error("Live notification polling failed", error);
    }
  }, []);

  useEffect(() => {
    pollLiveEvents();
    const timer = window.setInterval(pollLiveEvents, 3000);
    return () => window.clearInterval(timer);
  }, [pollLiveEvents]);

  const updateCall = async (status: "ONGOING" | "REJECTED") => {
    if (!activeCall?.call?.id) return;
    await fetch("/api/calls", {
      method: "PATCH",
      headers: withCsrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ call_id: activeCall.call.id, status }),
    });

    if (status === "ONGOING") {
      window.location.href = `/chat/call/${activeCall.call.id}`;
      return;
    }

    setActiveCall(null);
  };

  return (
    <>
      {isAuthenticated && permission === "default" && (
        <button
          type="button"
          onClick={enableNotifications}
          style={{ position: "fixed", right: "1rem", bottom: "1rem", zIndex: 99980, border: "1px solid var(--glass-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", boxShadow: "0 12px 35px rgba(0,0,0,0.3)" }}
        >
          <Bell size={16} /> Enable notifications
        </button>
      )}

      {activeCall && (
        <div style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)", width: "min(460px, calc(100vw - 2rem))", zIndex: 100000, background: "#101827", border: "1px solid rgba(34,197,94,0.45)", borderRadius: "var(--radius-sm)", boxShadow: "0 25px 70px rgba(0,0,0,0.5)", padding: "1rem", color: "#fff", display: "grid", gap: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.16)", color: "#22c55e" }}>
              {activeCall.call?.media_type === "AUDIO" ? <Phone size={22} /> : <Video size={22} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block" }}>{activeCall.title}</strong>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>{activeCall.body}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => updateCall("REJECTED")} style={{ border: "1px solid rgba(255,255,255,0.16)" }}>Decline</button>
            <button type="button" className="btn btn-primary" onClick={() => updateCall("ONGOING")}>Accept</button>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ position: "fixed", right: "1rem", bottom: permission === "default" ? "4.8rem" : "1rem", zIndex: 99979, display: "grid", gap: "0.5rem", width: "min(360px, calc(100vw - 2rem))" }}>
          {events.map((event) => (
            <div key={event.id} style={{ background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "0.85rem", boxShadow: "0 12px 35px rgba(0,0,0,0.32)", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.6rem" }}>
              <button type="button" onClick={() => { window.location.href = event.link; }} style={{ textAlign: "left", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}>
                <strong style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>{event.title}</strong>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{event.body}</span>
              </button>
              <button type="button" onClick={() => setEvents((current) => current.filter((item) => item.id !== event.id))} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", width: "28px", height: "28px" }} title="Dismiss">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}