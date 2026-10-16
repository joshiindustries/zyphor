import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function AccountAccess({ mode }) {
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setDone("");
    const form = new FormData(event.currentTarget);
    const value = Object.fromEntries(form.entries());
    try {
      if (mode === "signup") {
        await api("POST", "/api/zyphor/auth/signup", value, { noRedirect: true });
        setDone("If the account can be created, a verification email will be sent. Your college team must approve your request after you verify.");
      } else if (mode === "verify") {
        if (params.get("token")) {
          await api("POST", "/api/zyphor/auth/verify-email", { token: params.get("token") }, { noRedirect: true });
          setDone("Your email is verified. Your college membership request is now waiting for approval.");
        } else {
          await api("POST", "/api/zyphor/auth/verification/resend", { email: value.email }, { noRedirect: true });
          setDone("If the account needs verification, a new email will be sent shortly.");
        }
      } else if (mode === "forgot") {
        await api("POST", "/api/zyphor/auth/password-reset/request", { email: value.email }, { noRedirect: true });
        setDone("If the account can use password recovery, a reset email will be sent shortly.");
      } else {
        await api("POST", "/api/zyphor/auth/password-reset/confirm", {
          token: params.get("token") || "", new_password: value.password,
        }, { noRedirect: true });
        setDone("Password reset. You can now sign in.");
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const titles = { signup: "Create student account", verify: "Verify your email", forgot: "Recover your account", reset: "Choose a new password" };
  return <main className="auth-main"><section className="auth-card">
    <h1>{titles[mode]}</h1>
    {done ? <p role="status">{done}</p> : <form onSubmit={submit}>
      {mode === "signup" && <>
        <label className="field">Name<input name="name" required maxLength="255" autoComplete="name" /></label>
        <label className="field">College code<input name="college_code" required maxLength="32" autoComplete="organization" /></label>
        <label className="field">Branch (optional)<input name="branch" maxLength="64" /></label>
      </>}
      {(mode === "signup" || mode === "forgot" || (mode === "verify" && !params.get("token"))) &&
        <label className="field">Email<input name="email" required type="email" maxLength="255" autoComplete="email" /></label>}
      {(mode === "signup" || mode === "reset") && <label className="field">{mode === "signup" ? "Password" : "New password"}
        <input name={mode === "signup" ? "password" : "password"} required type="password" minLength="8" maxLength="128" autoComplete={mode === "signup" ? "new-password" : "new-password"} /></label>}
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? "Working…" : ({ signup: "Create account", verify: params.get("token") ? "Verify email" : "Resend verification email", forgot: "Send recovery email", reset: "Reset password" }[mode])}
      </button>
    </form>}
    <p className="muted"><Link to="/login">Back to sign in</Link></p>
  </section></main>;
}
