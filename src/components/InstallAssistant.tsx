"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, DownloadCloud, ExternalLink, Info, Monitor, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";

const INSTALLED_RELEASE_KEY = "zyphor_installed_release";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type VersionInfo = {
  version: string;
  shortCommit: string | null;
  buildTime: string | null;
  releaseId: string;
};

type DeviceInfo = {
  os: string;
  browser: string;
  isMobile: boolean;
  isStandalone: boolean;
  supportsServiceWorker: boolean;
};

type InstallAssistantProps = {
  enforced?: boolean;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    document.referrer.includes("android-app://");
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      os: "Unknown",
      browser: "Unknown",
      isMobile: false,
      isStandalone: false,
      supportsServiceWorker: false,
    };
  }

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      mobile?: boolean;
      brands?: Array<{ brand: string; version: string }>;
    };
  };
  const ua = navigator.userAgent;
  const platform = nav.userAgentData?.platform || navigator.platform || "";
  const brands = (nav.userAgentData?.brands || []).map((brand) => brand.brand).join(" ");

  let os = "Unknown";
  if (/android/i.test(ua)) os = "Android";
  else if (/iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) os = "iOS";
  else if (/Win/i.test(platform)) os = "Windows";
  else if (/Mac/i.test(platform)) os = "macOS";
  else if (/Linux/i.test(platform)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//.test(ua) || brands.includes("Microsoft Edge")) browser = "Microsoft Edge";
  else if (/OPR\//.test(ua) || brands.includes("Opera")) browser = "Opera";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//.test(ua) || brands.includes("Google Chrome")) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  return {
    os,
    browser,
    isMobile: Boolean(nav.userAgentData?.mobile) || /Android|iPhone|iPad|iPod/i.test(ua),
    isStandalone: isStandaloneDisplay(),
    supportsServiceWorker: "serviceWorker" in navigator,
  };
}

async function clearCachesAndWorkers() {
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
}

function getInstallSteps(device: DeviceInfo): string[] {
  if (device.os === "iOS") {
    if (device.browser === "Safari") {
      return [
        "Tap the Share button in Safari.",
        "Choose Add to Home Screen.",
        "Confirm Add, then open Zyphor from your home screen.",
      ];
    }

    return [
      "Open this page in Safari for the best iPhone or iPad install flow.",
      "Tap Share, then Add to Home Screen.",
      "Open Zyphor from your home screen after it is added.",
    ];
  }

  if (device.os === "Android") {
    return [
      "Open the browser menu.",
      "Choose Install app or Add to Home screen.",
      "Open Zyphor from the new app icon.",
    ];
  }

  if (device.browser === "Chrome" || device.browser === "Microsoft Edge") {
    return [
      "Click the install icon in the address bar, if it appears.",
      "Or open the browser menu and choose Apps, then Install this site.",
      "Pin Zyphor to your taskbar or dock after it opens as an app.",
    ];
  }

  return [
    "Use Chrome or Microsoft Edge for the simplest one-click install.",
    "Open the browser menu and look for Install app or Add page shortcut.",
    "Return here after installing to confirm your version is current.",
  ];
}

export default function InstallAssistant({ enforced = false }: InstallAssistantProps) {
  const [device, setDevice] = useState<DeviceInfo>(() => getDeviceInfo());
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [installedRelease, setInstalledRelease] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [status, setStatus] = useState<"idle" | "installing" | "updating" | "updated" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const syncDevice = () => setDevice(getDeviceInfo());
    syncDevice();

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener("change", syncDevice);
    window.addEventListener("focus", syncDevice);

    return () => {
      media.removeEventListener("change", syncDevice);
      window.removeEventListener("focus", syncDevice);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      const releaseId = versionInfo?.releaseId || "installed";
      localStorage.setItem(INSTALLED_RELEASE_KEY, releaseId);
      setInstalledRelease(releaseId);
      setStatus("updated");
      setMessage("Zyphor is installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [versionInfo?.releaseId]);

  useEffect(() => {
    setInstalledRelease(localStorage.getItem(INSTALLED_RELEASE_KEY));

    fetch(`/api/version?ts=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.releaseId) {
          setVersionInfo({
            version: data.version,
            shortCommit: data.shortCommit || null,
            buildTime: data.buildTime || null,
            releaseId: data.releaseId,
          });
        }
      })
      .catch(() => {
        setMessage("Could not check the latest version right now.");
      });
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!versionInfo?.releaseId || !device.isStandalone) return;

    const stored = localStorage.getItem(INSTALLED_RELEASE_KEY);
    if (!stored) {
      localStorage.setItem(INSTALLED_RELEASE_KEY, versionInfo.releaseId);
      setInstalledRelease(versionInfo.releaseId);
    }
  }, [device.isStandalone, versionInfo?.releaseId]);

  const installSteps = useMemo(() => getInstallSteps(device), [device]);
  const isInstalled = device.isStandalone || Boolean(installedRelease);
  const needsUpdate = Boolean(isInstalled && versionInfo?.releaseId && installedRelease && installedRelease !== versionInfo.releaseId);
  const isCurrent = Boolean(isInstalled && versionInfo?.releaseId && (!installedRelease || installedRelease === versionInfo.releaseId));
  const versionText = versionInfo
    ? `v${versionInfo.version}${versionInfo.shortCommit ? ` (${versionInfo.shortCommit})` : ""}`
    : "Checking version";

  const installApp = async () => {
    if (!deferredPrompt) {
      setShowSteps(true);
      setMessage("Use the steps below if your browser does not show the one-click install prompt.");
      return;
    }

    setStatus("installing");
    setMessage("Waiting for your browser to finish installing Zyphor.");

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        const releaseId = versionInfo?.releaseId || "installed";
        localStorage.setItem(INSTALLED_RELEASE_KEY, releaseId);
        setInstalledRelease(releaseId);
        setStatus("updated");
        setMessage("Installed. Open Zyphor from the new app icon for the best experience.");
      } else {
        setStatus("idle");
        setShowSteps(true);
        setMessage("Install was dismissed. You can still install from your browser menu.");
      }
      setDeferredPrompt(null);
    } catch {
      setStatus("error");
      setShowSteps(true);
      setMessage("The one-click prompt was not available. Use the manual steps below.");
    }
  };

  const updateApp = async () => {
    if (!versionInfo?.releaseId) {
      setMessage("Could not find the latest version yet. Try again in a moment.");
      return;
    }

    setStatus("updating");
    setMessage("Refreshing cached files and loading the latest Zyphor release.");

    try {
      await clearCachesAndWorkers();
      localStorage.setItem(INSTALLED_RELEASE_KEY, versionInfo.releaseId);
      setInstalledRelease(versionInfo.releaseId);
      window.location.reload();
    } catch {
      setStatus("error");
      setMessage("Could not refresh automatically. Reload the page once, then try again.");
    }
  };

  const primaryAction = () => {
    if (needsUpdate) return updateApp;
    if (!isInstalled) return installApp;
    return undefined;
  };

  const primaryLabel = needsUpdate
    ? "Update Zyphor"
    : isCurrent
      ? "App is up to date"
      : deferredPrompt
        ? "Install Zyphor"
        : "Show install steps";

  return (
    <section style={{ width: "100%", minHeight: enforced ? "100vh" : "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: enforced ? "2rem" : "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: "980px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", alignItems: "stretch" }}>
        <div className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "1.5rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "inline-flex", width: "52px", height: "52px", borderRadius: "var(--radius-sm)", alignItems: "center", justifyContent: "center", background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.24)" }}>
            {device.isMobile ? <Smartphone size={26} color="var(--accent-blue)" /> : <Monitor size={26} color="var(--accent-blue)" />}
          </div>

          <div>
            <p style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem" }}>{device.browser} on {device.os}</p>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", lineHeight: 1.1, marginBottom: "0.75rem" }}>
              Install Zyphor in one click
            </h1>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Zyphor checks your device and gives the right install or update action. Installed apps can refresh cached files when a newer release is available.
            </p>
          </div>

          <div style={{ display: "grid", gap: "0.65rem" }}>
            <button
              type="button"
              className={needsUpdate || !isInstalled ? "btn btn-primary" : "btn btn-secondary"}
              onClick={primaryAction()}
              disabled={status === "installing" || status === "updating" || isCurrent}
              style={{ width: "100%", opacity: status === "installing" || status === "updating" || isCurrent ? 0.7 : 1 }}
            >
              {needsUpdate ? <RefreshCw size={18} /> : isCurrent ? <CheckCircle2 size={18} /> : <DownloadCloud size={18} />}
              {status === "installing" ? "Installing..." : status === "updating" ? "Updating..." : primaryLabel}
            </button>

            <button type="button" className="btn btn-secondary" onClick={() => setShowSteps((value) => !value)} style={{ width: "100%", border: "1px solid var(--glass-border)" }}>
              <Info size={18} /> {showSteps ? "Hide steps" : "Manual install steps"}
            </button>

            <Link href={isInstalled ? "/dashboard" : "/"} className="btn btn-secondary" style={{ width: "100%", border: "1px solid var(--glass-border)", textDecoration: "none" }}>
              <ExternalLink size={18} /> {isInstalled ? "Open dashboard" : "Back to home"}
            </Link>
          </div>

          {message && (
            <p style={{ margin: 0, color: status === "error" ? "#ef4444" : "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {message}
            </p>
          )}
        </div>

        <div className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "1.5rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Install status</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {isInstalled ? "This device has Zyphor installed or marked as installed." : "This browser is ready to install Zyphor."}
              </p>
            </div>
            <span style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "0.35rem 0.55rem", color: isCurrent ? "#10b981" : needsUpdate ? "#f59e0b" : "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 700 }}>
              {needsUpdate ? "Update available" : isCurrent ? "Updated" : "Not installed"}
            </span>
          </div>

          <div style={{ display: "grid", gap: "0.6rem" }}>
            <div style={{ padding: "0.85rem", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.18)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: "0.25rem" }}>Current release</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{versionText}</p>
            </div>
            <div style={{ padding: "0.85rem", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.18)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: "0.25rem" }}>Installed release</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{installedRelease || (device.isStandalone ? "Detected app mode" : "Not installed yet")}</p>
            </div>
            <div style={{ padding: "0.85rem", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <ShieldCheck size={18} color={device.supportsServiceWorker ? "#10b981" : "#f59e0b"} />
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {device.supportsServiceWorker ? "Update refresh is supported on this browser." : "This browser has limited app update support."}
              </p>
            </div>
          </div>

          {showSteps && (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Steps for {device.browser} on {device.os}</h3>
              {installSteps.map((step, index) => (
                <div key={step} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "0.65rem", alignItems: "start" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.14)", color: "var(--accent-blue)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem" }}>{index + 1}</span>
                  <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
