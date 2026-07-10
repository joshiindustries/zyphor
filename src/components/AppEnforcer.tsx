"use client";

import { useState, useEffect } from "react";
import { DownloadCloud, Monitor, Smartphone } from "lucide-react";

export default function AppEnforcer({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(true); // Assume standalone initially to avoid flicker

  useEffect(() => {
    // Check if running as a standalone PWA or natively wrapped
    const checkStandalone = () => {
      const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone || 
                    document.referrer.includes('android-app://');
      
      // We might also check for specific user agents if it's wrapped in Electron/Tauri
      // But checking display-mode is standard for PWA
      setIsStandalone(!!isPwa);
    };

    checkStandalone();
    
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);

  if (!isStandalone) {
    return (
      <div style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99998,
        padding: "2rem",
        textAlign: "center",
        overflowY: "auto"
      }}>
        <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "2rem", borderRadius: "50%", marginBottom: "2rem" }}>
          <DownloadCloud size={64} color="#3b82f6" />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Download the App</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "500px", marginBottom: "2rem" }}>
          For security and optimal performance, Zyphor requires you to use the dedicated app. 
          This ensures device keys are securely stored and background processes run smoothly.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", width: "100%", maxWidth: "600px" }}>
          <button 
            className="btn btn-primary"
            style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}
            onClick={() => alert("Please use your browser's menu to 'Install App' or 'Add to Home Screen'.")}
          >
            <Smartphone size={32} />
            <span style={{ fontWeight: "600" }}>Install on Mobile</span>
            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>(PWA / Add to Home Screen)</span>
          </button>
          
          <button 
            className="btn btn-secondary"
            style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", border: "1px solid var(--glass-border)" }}
            onClick={() => alert("Please use your browser's menu to 'Install Zyphor'.")}
          >
            <Monitor size={32} />
            <span style={{ fontWeight: "600" }}>Install on Desktop</span>
            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>(Chrome/Edge App)</span>
          </button>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "2rem" }}>
          If you are a developer testing the app, you can bypass this in Chrome DevTools by checking "Emulate CSS media feature display-mode: standalone".
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
