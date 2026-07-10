"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_FLAG = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.toLowerCase();
const TURNSTILE_ENABLED =
  TURNSTILE_FLAG === "true" ? true :
  TURNSTILE_FLAG === "false" ? false :
  process.env.NODE_ENV === "production";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorCode = searchParams.get("error");
    const reason = searchParams.get("reason");
    if (reason === "browser_closed") {
      setError("For security, your session ended because the previous browser window was closed. Please log in again.");
      return;
    }
    if (errorCode === "database_unavailable") {
      setError("Authentication database is temporarily unavailable. Please verify DATABASE_URL and try again.");
      return;
    }
    if (errorCode === "schema_missing") {
      setError("Database schema is missing required tables. Run the Supabase SQL migration, then retry.");
    }
  }, [searchParams]);

  const getFingerprint = () => {
    const data = [
      navigator.userAgent,
      screen.width + "x" + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join("|");
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const fingerprintHash = getFingerprint();
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        turnstileToken: TURNSTILE_ENABLED ? turnstileToken : undefined,
        fingerprintHash
      });

      if (res?.error) {
        if (res.error === "device_verification_required") {
          setShowOtp(true);
          setError("Unrecognized device. We've sent a one-time passcode to your email.");
        } else {
          setError(res.error);
          setTurnstileToken(null);
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const fingerprintHash = getFingerprint();
      const meta = {
        os: navigator.platform || "Unknown OS",
        browser: navigator.userAgent.substring(0, 50) || "Unknown Browser"
      };

      const verifyRes = await fetch("/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          fingerprintHash,
          trustDevice,
          os: meta.os,
          browser: meta.browser
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Failed to verify OTP.");
      }

      // Re-authenticate now that the device is trusted and cookie is set
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        turnstileToken: TURNSTILE_ENABLED ? turnstileToken : undefined,
        fingerprintHash
      });

      if (res?.error) {
        throw new Error(res.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem", borderRadius: "var(--radius-lg)" }}>
        <h2 className="title-gradient" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", textAlign: "center" }}>Welcome Back</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", textAlign: "center" }}>Log in to access your dashboard</p>

        {error && <div style={{ color: "#ff4444", marginBottom: "1rem", fontSize: "0.9rem", background: "rgba(255, 0, 0, 0.1)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>{error}</div>}

        {showOtp ? (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Enter 6-digit Code</label>
              <input
                type="text"
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="input-field"
                placeholder="123456"
                maxLength={6}
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="trustDevice"
                checked={trustDevice}
                onChange={e => setTrustDevice(e.target.checked)}
              />
              <label htmlFor="trustDevice" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Trust this device for 30 days
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: "1rem" }}>
              {loading ? "Verifying..." : "Verify Device"}
            </button>
            <button type="button" onClick={() => setShowOtp(false)} className="btn btn-secondary" style={{ width: "100%", padding: "1rem", marginTop: "-0.5rem" }}>
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="********"
              />
            </div>
            {TURNSTILE_ENABLED ? (
              <div style={{ display: "flex", justifyContent: "center", minHeight: "65px" }}>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                  onSuccess={(token) => setTurnstileToken(token)}
                />
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textAlign: "center" }}>
                Turnstile disabled for local development.
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading || (TURNSTILE_ENABLED && !turnstileToken)} style={{ width: "100%", padding: "1rem" }}>
              {loading ? "Loading, please wait..." : "Log In"}
            </button>
          </form>
        )}

        <div style={{ margin: "2rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="btn btn-secondary" style={{ width: "100%", background: "white", color: "black", border: "none" }}>
            <img src="https://authjs.dev/img/providers/google.svg" width="20" height="20" alt="Google" style={{ marginRight: "0.5rem" }} />
            Continue with Google
          </button>
          <button onClick={() => signIn("github", { callbackUrl: "/dashboard" })} className="btn btn-secondary" style={{ width: "100%", background: "#24292e", color: "white", border: "none" }}>
            <img src="https://authjs.dev/img/providers/github.svg" width="20" height="20" alt="GitHub" style={{ marginRight: "0.5rem", filter: "invert(1)" }} />
            Continue with GitHub
          </button>
        </div>

        <p style={{ marginTop: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Don't have an account? <Link href="/register" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>Sign Up</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          Loading, please wait...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
