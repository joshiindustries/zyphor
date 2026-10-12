import { Component, useEffect, useState } from "react";

export function ErrorState({ message, onRetry, title = "We couldn't load this view" }) {
  return <section className="recovery-card" role="alert">
    <span className="recovery-symbol" aria-hidden="true">!</span>
    <h2>{title}</h2><p>{message || "Please try again. If this continues, contact your event administrator."}</p>
    {onRetry && <button className="btn primary" onClick={onRetry}>Try again</button>}
  </section>;
}

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("Zyphor view failed", error); }
  render() {
    if (this.state.failed) return <div className="pre-start"><ErrorState
      title="This view encountered a problem"
      message="Please retry this view. If you were taking an exam, contact your administrator before refreshing; unsaved responses may need to be recovered."
      onRetry={() => this.setState({ failed: false })} /></div>;
    return this.props.children;
  }
}

export function ConnectionNotice() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (online) return null;
  return <div className="connection-notice" role="status">You're offline. Keep this page open and reconnect to save your responses.</div>;
}
