import { Component, useEffect, useState } from "react";

export function ErrorState({ message, onRetry, title = "We couldn't load this view" }) {
  return <section className="recovery-card" role="alert">
    <span className="recovery-symbol" aria-hidden="true">!</span>
    <h2>{title}</h2><p>{message || "Please try again. If this continues, contact your event administrator."}</p>
    {onRetry && <button className="btn primary" onClick={onRetry}>Try again</button>}
  </section>;
}

export class ErrorBoundary extends Component {
  state = { failed: false, error: null };
  static getDerivedStateFromError(error) { return { failed: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Zyphor view failed", error, errorInfo); }
  render() {
    if (this.state.failed) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="recovery-card max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-bold text-xl mb-3">!</span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">This view encountered a problem</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Please retry this view. If you were taking an exam, contact your administrator before refreshing; unsaved responses may need to be recovered.
            </p>
            {this.state.error && (
              <details className="text-left text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 mb-4 overflow-auto max-h-48">
                <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">Technical details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
                {this.state.error.stack && (
                  <pre className="mt-1 text-[10px] text-slate-500 whitespace-pre-wrap overflow-x-auto">{this.state.error.stack}</pre>
                )}
              </details>
            )}
            <button
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-zyphor-indigo-600 text-white hover:bg-zyphor-indigo-700 transition-colors"
              onClick={() => this.setState({ failed: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
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
