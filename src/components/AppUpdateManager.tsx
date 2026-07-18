"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, X } from "lucide-react";

const INSTALLED_RELEASE_KEY = "zyphor_installed_release";

type VersionInfo = {
  releaseId: string;
  version: string;
  shortCommit: string | null;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    document.referrer.includes("android-app://");
}

async function refreshApp(releaseId: string) {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      registration.active?.postMessage({ type: "CLEAR_CACHES" });
      await registration.update().catch(() => undefined);
      await registration.unregister().catch(() => undefined);
    }));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  localStorage.setItem(INSTALLED_RELEASE_KEY, releaseId);
  window.location.reload();
}

export default function AppUpdateManager() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let stopped = false;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/version?ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (stopped || !data?.releaseId) return;

        const nextInfo = {
          releaseId: data.releaseId,
          version: data.version,
          shortCommit: data.shortCommit || null,
        };
        setVersionInfo(nextInfo);

        const storedRelease = localStorage.getItem(INSTALLED_RELEASE_KEY);
        if (isStandaloneDisplay() && !storedRelease) {
          localStorage.setItem(INSTALLED_RELEASE_KEY, nextInfo.releaseId);
          return;
        }

        setUpdateAvailable(Boolean(storedRelease && storedRelease !== nextInfo.releaseId));
      } catch {
        // Version checks should never interrupt the app.
      }
    };

    checkVersion();
    const timer = window.setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!updateAvailable || dismissed || !versionInfo) return null;

  return (
    <div style={{ position: "fixed", right: "1rem", bottom: "1rem", zIndex: 99990, width: "min(360px, calc(100vw - 2rem))", background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", boxShadow: "0 18px 50px rgba(0,0,0,0.35)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <strong style={{ display: "block", marginBottom: "0.2rem" }}>Update available</strong>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            v{versionInfo.version}{versionInfo.shortCommit ? ` (${versionInfo.shortCommit})` : ""}
          </span>
        </div>
        <button type="button" onClick={() => setDismissed(true)} style={{ width: "32px", height: "32px", border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }} title="Dismiss update notice">
          <X size={18} />
        </button>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={async () => { setUpdating(true); await refreshApp(versionInfo.releaseId); }} disabled={updating} style={{ flex: "1 1 150px" }}>
          <RefreshCw size={16} /> {updating ? "Updating..." : "Update now"}
        </button>
        <Link href="/install" className="btn btn-secondary" style={{ flex: "1 1 120px", textDecoration: "none", border: "1px solid var(--glass-border)" }}>
          Details
        </Link>
      </div>
    </div>
  );
}
