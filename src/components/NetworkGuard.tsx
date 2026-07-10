"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Basic navigator online check
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    } else {
      checkConnection();
    }

    // Periodic deep check
    const interval = setInterval(checkConnection, 15000); // Check every 15s

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkConnection = async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }
    
    try {
      // Ping zyphorr.vercel.app to check true internet connectivity
      const res = await fetch("https://zyphorr.vercel.app/", { method: "HEAD", cache: "no-store" });
      if (res.ok || res.status >= 200 || res.type === 'opaque') { // opaque for no-cors
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (err) {
      // CORS or network failure
      setIsOffline(true);
    }
  };

  if (isOffline) {
    return (
      <div style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "2rem",
        textAlign: "center"
      }}>
        <div style={{ background: "rgba(231, 76, 60, 0.1)", padding: "2rem", borderRadius: "50%", marginBottom: "2rem" }}>
          <WifiOff size={64} color="#e74c3c" />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>No Internet Connection</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", maxWidth: "400px" }}>
          Zyphor requires an active internet connection to securely sync and encrypt your data. Please check your connection to continue.
        </p>
        <button 
          onClick={checkConnection}
          className="btn btn-primary"
          style={{ marginTop: "2rem" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
