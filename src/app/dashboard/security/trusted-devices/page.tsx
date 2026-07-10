"use client";

import { useState, useEffect } from "react";
import { Shield, Smartphone, Monitor, Trash2, Clock, Globe } from "lucide-react";
import Link from "next/link";

export default function TrustedDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/security/trusted-devices");
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/security/trusted-devices?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDevices(devices.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Shield size={32} color="var(--accent-blue)" />
          Trusted Devices
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
          Manage devices that have securely logged into your account. Revoke access for any unrecognized devices.
        </p>
      </header>

      {error && <div style={{ color: "var(--accent-red)", padding: "1rem", background: "rgba(255,0,0,0.1)", borderRadius: "var(--radius-sm)" }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loading ? (
          <p>Loading devices...</p>
        ) : devices.length === 0 ? (
          <p>No trusted devices found.</p>
        ) : (
          devices.map((device) => (
            <div key={device.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }}>
                  {device.os?.toLowerCase().includes("win") || device.os?.toLowerCase().includes("mac") ? (
                    <Monitor size={24} color="var(--text-primary)" />
                  ) : (
                    <Smartphone size={24} color="var(--text-primary)" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.25rem" }}>{device.browser} on {device.os}</h3>
                  <div style={{ display: "flex", gap: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Globe size={14} /> {device.ip_address || "Unknown IP"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={14} /> Last active: {new Date(device.last_active).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleRevoke(device.id)}
                className="btn btn-secondary" 
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)", borderColor: "rgba(255,0,0,0.3)" }}
              >
                <Trash2 size={16} /> Revoke
              </button>
            </div>
          ))
        )}
      </div>
      
      <Link href="/dashboard/security" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        Back to Security Dashboard
      </Link>
    </div>
  );
}
