import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, download } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";

export function CertificateActions({ attemptId }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(null);
  async function changeSharing(enable) {
    setBusy(true);
    try {
      const path = `/api/zyphor/student/attempts/${attemptId}/certificate/share`;
      if (enable) {
        const result = await api("POST", path);
        const base = new URL(import.meta.env.BASE_URL, window.location.origin);
        setShare({ ...result, url: new URL(`certificates/${result.token}`, base).href });
      } else { await api("DELETE", path); setShare(null); toast("Certificate sharing revoked", "success"); }
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  }
  return <details><summary>Certificate and verification</summary>
    <p className="small muted">Verification links share your name, organization, assessment and marks for 30 days. A new link replaces the old one. Regrading invalidates the link. PDFs are downloaded privately.</p>
    <div className="row wrap">
      <button className="btn sm" onClick={() => download(`/api/zyphor/student/attempts/${attemptId}/certificate`, `zyphor_certificate_${attemptId}.pdf`).catch(e => toast(e.message, "error"))}>Download certificate PDF</button>
      <button className="btn sm" disabled={busy} onClick={() => changeSharing(true)}>Create verification link</button>
      <button className="btn sm" disabled={busy} onClick={() => changeSharing(false)}>Revoke verification link</button>
    </div>
    {share && <><label>Copy verification link<input readOnly value={share.url} onFocus={e => e.target.select()} /></label>
      <p className="small">{share.certificate_id} · Expires {new Date(share.expires_at).toLocaleString()}</p></>}
  </details>;
}

export default function CertificateVerification() {
  const { token } = useParams();
  const [state, setState] = useState({ data: null, error: "" });
  useEffect(() => {
    let active = true;
    setState({ data: null, error: "" });
    api("GET", `/api/zyphor/public/certificates/${encodeURIComponent(token)}`)
      .then(data => { if (active) setState({ data, error: "" }); })
      .catch(e => { if (active) setState({ data: null, error: e.status === 404
        ? "This certificate is unavailable, expired, revoked, or superseded. Ask the student for a current verification link."
        : e.message }); });
    return () => { active = false; };
  }, [token]);
  const data = state.data;
  return <main className="wrap" style={{ maxWidth: 760, margin: "40px auto", padding: 24 }}>
    <h1>Zyphor Certificate Verification</h1>
    {state.error ? <p role="alert">{state.error}</p> : !data ? <Loading /> : <article className="card pad">
      <Badge color="green">Verified platform result</Badge><h2>{data.name}</h2>
      <dl><dt>Organization</dt><dd>{data.organization}</dd><dt>Assessment</dt><dd>{data.exam}</dd>
        <dt>Marks</dt><dd>{data.score} / {data.maximum} · {data.percentage}%</dd>
        <dt>Completed</dt><dd>{new Date(data.completed_at).toLocaleString()}</dd>
        <dt>Certificate ID</dt><dd style={{ overflowWrap: "anywhere" }}>{data.certificate_id}</dd>
        <dt>Sharing expires</dt><dd>{new Date(data.sharing_expires_at).toLocaleString()}</dd></dl>
      <p className="muted small">{data.verification}</p>
    </article>}
  </main>;
}
