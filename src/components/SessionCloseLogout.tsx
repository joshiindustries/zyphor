"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";

const AUTH_TAB_HEARTBEATS_KEY = "zyphor_auth_tab_heartbeats_v1";
const AUTH_LAST_SEEN_KEY = "zyphor_auth_last_seen_v1";
const TAB_READY_KEY = "zyphor_auth_tab_ready_v1";
const HEARTBEAT_MS = 15000;
const STALE_MS = 45000;

type HeartbeatMap = Record<string, number>;

function readHeartbeats(): HeartbeatMap {
  try {
    const raw = localStorage.getItem(AUTH_TAB_HEARTBEATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as HeartbeatMap;
  } catch {
    return {};
  }
}

function writeHeartbeats(value: HeartbeatMap): void {
  localStorage.setItem(AUTH_TAB_HEARTBEATS_KEY, JSON.stringify(value));
}

function pruneHeartbeats(input: HeartbeatMap, now: number): HeartbeatMap {
  const output: HeartbeatMap = {};
  for (const [key, ts] of Object.entries(input)) {
    if (typeof ts === "number" && now - ts <= STALE_MS) {
      output[key] = ts;
    }
  }
  return output;
}

export default function SessionCloseLogout() {
  const { status } = useSession();
  const tabId = useMemo(
    () => `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    if (status !== "unauthenticated") return;
    sessionStorage.removeItem(TAB_READY_KEY);
    localStorage.removeItem(AUTH_LAST_SEEN_KEY);
    localStorage.removeItem(AUTH_TAB_HEARTBEATS_KEY);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const now = Date.now();
    const current = pruneHeartbeats(readHeartbeats(), now);
    const hasActiveAuthTab = Object.keys(current).length > 0;
    const hadPreviousAuth = Boolean(localStorage.getItem(AUTH_LAST_SEEN_KEY));
    const returningSameTab = sessionStorage.getItem(TAB_READY_KEY) === "1";

    current[tabId] = now;
    writeHeartbeats(current);
    sessionStorage.setItem(TAB_READY_KEY, "1");
    localStorage.setItem(AUTH_LAST_SEEN_KEY, String(now));

    // If previous auth existed, no active tabs remain, and this is a fresh tab session,
    // treat it as a reopened browser and force sign-out.
    if (hadPreviousAuth && !hasActiveAuthTab && !returningSameTab) {
      void signOut({ callbackUrl: "/login?reason=browser_closed" });
      return;
    }

    const beat = () => {
      const ts = Date.now();
      const map = pruneHeartbeats(readHeartbeats(), ts);
      map[tabId] = ts;
      writeHeartbeats(map);
      localStorage.setItem(AUTH_LAST_SEEN_KEY, String(ts));
    };

    const removeCurrentTab = () => {
      const map = pruneHeartbeats(readHeartbeats(), Date.now());
      if (map[tabId]) {
        delete map[tabId];
        writeHeartbeats(map);
      }
    };

    const interval = window.setInterval(beat, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        beat();
      }
    };

    window.addEventListener("beforeunload", removeCurrentTab);
    window.addEventListener("pagehide", removeCurrentTab);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", removeCurrentTab);
      window.removeEventListener("pagehide", removeCurrentTab);
      document.removeEventListener("visibilitychange", onVisibility);
      removeCurrentTab();
    };
  }, [status, tabId]);

  return null;
}
