"use client";

import { FormEvent, useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { signIn, useSession } from "next-auth/react";

declare global {
  interface Window { zyphorDesktop?: { authenticated(token: string, id: string, email: string, name: string): void } }
}

const enabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.toLowerCase() !== "false";

export default function DesktopLoginPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const completeWithCode = (code: string, redirectUri: string, state: string) => {
    window.location.assign(`${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    
    const query = new URLSearchParams(window.location.search);
    const redirectUri = query.get("redirect_uri");
    const state = query.get("state");
    const codeChallenge = query.get("code_challenge");
    
    if (!redirectUri || !state || !codeChallenge) return;
    
    setLoading(true);
    setError("");
    fetch("/api/desktop/auth/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUri, codeChallenge })
    })
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok || !data?.code) throw new Error(data?.error || "Sign-in did not complete.");
        completeWithCode(data.code, redirectUri, state);
      })
      .catch(cause => {
        setError(cause instanceof Error ? cause.message : "Sign-in did not complete.");
        setLoading(false);
      });
  }, [status]);

  function social(provider: "google" | "github") {
    const query = new URLSearchParams(window.location.search);
    query.set("social", "1");
    const callbackUrl = `${window.location.origin}/desktop-login?${query.toString()}`;
    signIn(provider, { callbackUrl });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(window.location.search);
      const redirectUri = query.get("redirect_uri");
      const state = query.get("state");
      const codeChallenge = query.get("code_challenge");
      
      const response = await fetch("/api/desktop/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          turnstileToken: enabled ? turnstileToken : undefined,
          redirectUri: redirectUri || undefined,
          codeChallenge: codeChallenge || undefined
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || "Sign-in failed.");
      if (redirectUri && state && data.code) {
        completeWithCode(data.code, redirectUri, state);
        return;
      }
      if (!window.zyphorDesktop) throw new Error("Open this page from Zyphor Desktop to finish sign-in.");
      window.zyphorDesktop.authenticated(data.token, data.user.id, data.user.email || "", data.user.name || "Zyphor User");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "Segoe UI, sans-serif", padding: "24px" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#13131c", padding: 32, borderRadius: 16, border: "1px solid #2a2a35", display: "grid", gap: 16 }}>
        <h1 style={{ textAlign: "center", margin: 0 }}>ZYPHOR</h1>
        <p style={{ color: "#9aa0a6", textAlign: "center", margin: 0 }}>Secure desktop sign-in</p>
        
        {error && <p style={{ color: "#ff6b6b", margin: 0 }}>{error}</p>}
        
        {status === "authenticated" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p>Signed in as <strong>{session?.user?.email || session?.user?.name}</strong></p>
            <p style={{ color: "#9aa0a6" }}>Completing authentication...</p>
          </div>
        ) : (
          <>
            <label>
              Email
              <input required type="email" value={email} onChange={event => setEmail(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, background: "#1b1b24", border: "1px solid #2a2a35", color: "white", borderRadius: 8 }} />
            </label>
            <label>
              Password
              <input required type="password" value={password} onChange={event => setPassword(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, background: "#1b1b24", border: "1px solid #2a2a35", color: "white", borderRadius: 8 }} />
            </label>
            
            {enabled && (
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                onSuccess={setTurnstileToken} 
                onExpire={() => setTurnstileToken("")} 
              />
            )}
            
            <button disabled={loading || (enabled && !turnstileToken)} type="submit" style={{ padding: 13, border: 0, borderRadius: 8, color: "white", fontWeight: 700, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", cursor: "pointer" }}>
              {loading ? "Signing in..." : "Sign in securely"}
            </button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" disabled={loading} onClick={() => social("google")} style={{ padding: 12, borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer", background: "white", color: "black" }}>
                Google
              </button>
              <button type="button" disabled={loading} onClick={() => social("github")} style={{ padding: 12, borderRadius: 8, border: "1px solid #39404b", color: "white", background: "#24292e", fontWeight: 700, cursor: "pointer" }}>
                GitHub
              </button>
            </div>
            
            <p style={{ color: "#9aa0a6", fontSize: 12, margin: 0, textAlign: "center" }}>
              Cloudflare Turnstile protects this request. Your password is sent only to Zyphor over HTTPS.
            </p>
          </>
        )}
      </form>
    </main>
  );
}
