import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api.js";

// A browser's online flag only describes its network adapter. A bounded request
// to our own API verifies the connection that actually matters for this exam.
export default function ExamConnectionStatus({ heartbeatAt, heartbeatError }) {
  const [state, setState] = useState({ status: "checking", latency: null, checkedAt: null });
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let controller;
    let timeout;
    let busy = false;
    async function check() {
      if (!active || busy || document.hidden) return;
      if (!navigator.onLine) {
        setState({ status: "offline", latency: null, checkedAt: new Date() });
        return;
      }
      busy = true;
      setChecking(true);
      controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 6000);
      const started = performance.now();
      try {
        const response = await fetch(apiUrl("/api/health"), { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const health = await response.json();
        if (health.status !== "healthy" || health.database !== "healthy") throw new Error("Unhealthy");
        const latency = Math.round(performance.now() - started);
        if (active) setState({ status: latency > 2000 ? "slow" : "connected", latency, checkedAt: new Date() });
      } catch {
        if (active) setState({ status: navigator.onLine ? "unreachable" : "offline", latency: null, checkedAt: new Date() });
      } finally {
        clearTimeout(timeout);
        busy = false;
        if (active) setChecking(false);
      }
    }
    const offline = () => {
      controller?.abort();
      setState({ status: "offline", latency: null, checkedAt: new Date() });
    };
    check();
    const interval = setInterval(check, 20000);
    window.addEventListener("online", check);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(timeout);
      controller?.abort();
      window.removeEventListener("online", check);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", check);
    };
  }, [retry]);
  const labels = { checking: "Checking connection", connected: "Server connected", slow: "Slow server connection", unreachable: "Server unreachable", offline: "Offline" };
  const issue = heartbeatError || ["offline", "unreachable"].includes(state.status);
  return <details className={"exam-connection " + (issue ? "connection-warning" : state.status)}>
    <summary><span className="connection-dot" aria-hidden="true" /><span role="status">{heartbeatError ? "Exam sync interrupted" : labels[state.status]}</span></summary>
    <div className="connection-details">
      <strong>Exam connection</strong>
      <dl><dt>Browser network</dt><dd>{navigator.onLine ? "Available" : "Offline"}</dd>
        <dt>API and database</dt><dd>{labels[state.status]}</dd>
        <dt>Response time</dt><dd>{state.latency === null ? "—" : `${state.latency} ms`}</dd>
        <dt>Last health check</dt><dd>{state.checkedAt?.toLocaleTimeString() || "Pending"}</dd>
        <dt>Last exam heartbeat</dt><dd>{heartbeatAt?.toLocaleTimeString() || "Pending"}</dd></dl>
      {heartbeatError && <p role="alert">{heartbeatError}</p>}
      {issue && <p>Keep this page open. Check your connection and watch the save status before submitting.</p>}
      <button className="btn sm" disabled={checking} onClick={() => setRetry((n) => n + 1)}>{checking ? "Checking…" : "Check again"}</button>
    </div>
  </details>;
}
