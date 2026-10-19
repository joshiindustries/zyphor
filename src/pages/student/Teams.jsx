import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";
import { useAuth } from "../../lib/auth.jsx";

export default function Teams() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState("");
  const [inviteEmails, setInviteEmails] = useState({});
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [teams, openEvents] = await Promise.all([
        api("GET", "/api/zyphor/teams"), api("GET", "/api/zyphor/teams/available-events"),
      ]);
      setData(teams); setEvents(openEvents);
    } catch (err) { toast(err.message, "error"); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  async function act(fn, message) {
    setWorking(true);
    try { await fn(); toast(message, "success"); await load(); }
    catch (err) { toast(err.message, "error"); }
    finally { setWorking(false); }
  }

  if (!data) return <div className="wrap"><Loading /></div>;
  const token = params.get("invite");
  return <main className="wrap">
    <header className="bar"><h1>Teams and event registration</h1><span className="muted">{user?.name}</span></header>
    {token && <section className="card"><h2>Team invitation</h2><p>Accept or decline the invitation sent to your verified account.</p>
      <div className="row"><button className="btn primary" disabled={working} onClick={() => act(() => api("POST", "/api/zyphor/teams/invitations/respond", { token, accept: true }), "Invitation accepted")}>Accept</button>
        <button className="btn" disabled={working} onClick={() => act(() => api("POST", "/api/zyphor/teams/invitations/respond", { token, accept: false }), "Invitation declined")}>Decline</button></div>
    </section>}
    {data.invitations.length > 0 && <section className="card"><h2>Invitations</h2>{data.invitations.map((invite) =>
      <p key={invite.id}>{invite.team} <Badge color="amber">Waiting for your response</Badge></p>)}</section>}
    <section className="card"><h2>Create a team</h2><form className="row" onSubmit={(event) => {
      event.preventDefault(); act(async () => { await api("POST", "/api/zyphor/teams", { name }); setName(""); }, "Team created");
    }}><input aria-label="Team name" required minLength="2" maxLength="120" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
      <button className="btn primary" disabled={working}>Create team</button></form></section>
    {data.teams.map((team) => <section className="card" key={team.id}>
      <h2>{team.name}</h2><p className="muted">Team owner manages its roster.</p>
      <div className="table-wrap"><table><thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>
        {team.members.map((member) => <tr key={member.user_id}><td>{member.name}</td><td>{member.email || "—"}</td><td>{member.role}</td><td>
          {team.owner_user_id === user.id && member.user_id !== user.id && <span className="row tight">
            <button className="btn sm" disabled={working} onClick={() => act(() => api("POST", `/api/zyphor/teams/${team.id}/transfer/${member.user_id}`), "Team ownership transferred")}>Make owner</button>
            <button className="btn sm danger" disabled={working} onClick={() => act(() => api("DELETE", `/api/zyphor/teams/${team.id}/members/${member.user_id}`), "Member removed")}>Remove</button>
          </span>}
        </td></tr>)}
      </tbody></table></div>
      {team.owner_user_id === user.id && <form className="row" onSubmit={(event) => {
        event.preventDefault(); const email = inviteEmails[team.id];
        act(async () => { await api("POST", `/api/zyphor/teams/${team.id}/invitations`, { email });
          setInviteEmails((all) => ({ ...all, [team.id]: "" })); }, "Invitation queued by email");
      }}><input type="email" required maxLength="255" aria-label={`Invite to ${team.name}`} placeholder="Verified student email"
          value={inviteEmails[team.id] || ""} onChange={(e) => setInviteEmails((all) => ({ ...all, [team.id]: e.target.value }))} />
        <button className="btn" disabled={working}>Invite member</button></form>}
      <h3>Open event registrations</h3>
      {events.length ? events.map((event) => <div className="row between" key={event.id}>
        <span>{event.title} · {event.team_min_size}–{event.team_max_size} members{event.approval_required ? " · organizer approval required" : ""}</span>
        <button className="btn sm primary" disabled={working} onClick={() => act(() => api("POST", `/api/zyphor/teams/${team.id}/events/${event.id}/register`), "Team registered")}>Register team</button>
      </div>) : <p className="muted">No team registration is open for your organization.</p>}
      {data.registrations.filter((row) => row.team_id === team.id).map((row) => <p key={row.id}>{row.exam_title} <Badge color={row.status === "approved" ? "green" : row.status === "pending" ? "amber" : "red"}>{row.status}</Badge></p>)}
    </section>)}
    {data.teams.length === 0 && <p className="muted">Create a team or respond to an invitation to get started.</p>}
  </main>;
}
