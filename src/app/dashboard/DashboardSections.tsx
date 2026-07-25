import Link from "next/link";
import { Archive, Bot, Calendar, CheckSquare, Database, FileSearch, FileText, Fingerprint, GitBranch, HardDrive, KeyRound, Layers3, Lock, MessageSquare, Plug, Search, Server, Shield, ShieldCheck, Sparkles, Users, Video } from "lucide-react";

type DashboardStats = {
  notes: number;
  taskBoards: number;
  calendars: number;
  passwords: number;
  deviceKeys: number;
  passkeys: number;
  trustedDevices: number;
};

export default function DashboardSections({ userName, stats }: { userName: string; stats: DashboardStats }) {
  const suiteItems = [
    { href: "/dashboard/notes", icon: <FileText size={24} color="#f59e0b" />, label: "Secure Notes", text: "Encrypted private notes and shared work." },
    { href: "/dashboard/tasks", icon: <CheckSquare size={24} color="#38bdf8" />, label: "Tasks", text: "Boards, task lists and project planning." },
    { href: "/dashboard/calendar", icon: <Calendar size={24} color="#a78bfa" />, label: "Calendar", text: "Encrypted events and schedules." },
    { href: "/chat", icon: <MessageSquare size={24} color="#22c55e" />, label: "Chat & Calls", text: "Messages, groups, audio and video calls." },
    { href: "/dashboard/passwords", icon: <KeyRound size={24} color="#ef4444" />, label: "Passwords", text: "Encrypted password and TOTP manager." },
    { href: "/dashboard/setup-keys", icon: <Fingerprint size={24} color="#eab308" />, label: "Keys & Passkeys", text: "Device keys, PIN unlock and passkey records." },
    { href: "/dashboard/security", icon: <Shield size={24} color="#818cf8" />, label: "Security Center", text: "Trusted devices, recovery and audit controls." },
    { href: "/dashboard/drop", icon: <Archive size={24} color="#3b82f6" />, label: "Drop Inbox", text: "Receive encrypted messages and handoffs." },
  ];

  const statItems = [
    { label: "Notes", value: stats.notes },
    { label: "Task Boards", value: stats.taskBoards },
    { label: "Calendars", value: stats.calendars },
    { label: "Passwords", value: stats.passwords },
    { label: "Device Keys", value: stats.deviceKeys },
    { label: "Passkeys", value: stats.passkeys },
    { label: "Trusted Devices", value: stats.trustedDevices },
  ];

  const platformFeatures = [
    { icon: <Search size={20} />, title: "Universal Search", text: "Search across connected storage and encrypted workspace data from one command surface." },
    { icon: <Bot size={20} />, title: "AI Search", text: "Ask naturally, like finding a certificate, a project, or an archived document." },
    { icon: <Layers3 size={20} />, title: "Unified Explorer", text: "One dashboard for Zyphor storage, connected providers and self-hosted locations." },
    { icon: <GitBranch size={20} />, title: "Smart Placement", text: "Rules can place photos, videos, projects, backups and archives in the right storage target." },
    { icon: <Database size={20} />, title: "Cloud Migration", text: "Move or copy files between supported providers without making users hunt through apps." },
    { icon: <ShieldCheck size={20} />, title: "Security Layer", text: "Encryption, integrity checks, version history, trusted devices, audit logs and recommendations." },
  ];

  const providerGroups = [
    { title: "Zyphor Storage", icon: <Lock size={20} />, items: ["Zero-knowledge encryption", "AI search", "Secure sharing", "Version history"] },
    { title: "Connected Clouds", icon: <Plug size={20} />, items: ["Drive providers", "Object storage", "Enterprise file stores", "Storage connectors"] },
    { title: "Self-Hosted & Local", icon: <Server size={20} />, items: ["NAS systems", "SFTP / FTP", "WebDAV", "External drives"] },
  ];

  return (
    <div style={{ display: "grid", gap: "clamp(1.25rem, 3vw, 2rem)" }}>
      <section className="dashboard-hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: "1rem", alignItems: "stretch" }}>
        <div className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "clamp(1.25rem, 4vw, 2rem)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "2rem" }}>
          <div>
            <p style={{ color: "var(--accent-blue)", fontWeight: 700, marginBottom: "0.75rem" }}>Welcome, {userName}</p>
            <h2 style={{ fontSize: "clamp(2rem, 7vw, 4.25rem)", lineHeight: 1.02, letterSpacing: 0, marginBottom: "1rem" }}>
              Zyphor Cloud
            </h2>
            <p style={{ fontSize: "clamp(1.05rem, 2vw, 1.35rem)", color: "var(--text-primary)", maxWidth: "760px", lineHeight: 1.45 }}>
              One Platform. Every Cloud. Complete Control.
            </p>
            <p style={{ color: "var(--text-secondary)", maxWidth: "760px", lineHeight: 1.7, marginTop: "1rem" }}>
              Connect, secure, manage and share storage from a single dashboard. Zyphor Cloud is moving toward a Cloud Operating System for encrypted work, connected cloud accounts, self-hosted storage, search, backup and secure collaboration.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/dashboard/setup-keys" className="btn btn-primary" style={{ textDecoration: "none" }}><Fingerprint size={18} /> Secure Keys</Link>
            <Link href="/chat" className="btn btn-secondary" style={{ border: "1px solid var(--glass-border)", textDecoration: "none" }}><Video size={18} /> Chat & Calls</Link>
          </div>
        </div>

        <div className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Workspace Snapshot</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.65rem" }}>
            {statItems.map((item) => (
              <div key={item.label} style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "0.8rem", background: "rgba(0,0,0,0.18)", minWidth: 0 }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: "0.25rem" }}>{item.label}</p>
                <p style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "end", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.45rem", marginBottom: "0.35rem" }}>Core Apps</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>Fast paths into the web app from a single dashboard.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.85rem" }}>
          {suiteItems.map((item) => (
            <Link key={item.href} href={item.href} className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "1rem", textDecoration: "none", color: "inherit", display: "grid", gridTemplateColumns: "44px 1fr", gap: "0.85rem", alignItems: "start", minHeight: "112px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: "0.98rem", marginBottom: "0.35rem" }}>{item.label}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.45 }}>{item.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "clamp(1.1rem, 3vw, 1.6rem)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {providerGroups.map((group) => (
            <div key={group.title} style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "1rem", background: "rgba(0,0,0,0.16)" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", marginBottom: "0.8rem" }}>{group.icon}{group.title}</h3>
              <div style={{ display: "grid", gap: "0.45rem" }}>
                {group.items.map((item) => <p key={item} style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>{item}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.45rem", marginBottom: "1rem" }}>CloudOS Roadmap</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
          {platformFeatures.map((feature) => (
            <article key={feature.title} className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "1rem", minHeight: "142px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "var(--radius-sm)", background: "rgba(59,130,246,0.12)", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.8rem" }}>{feature.icon}</div>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.45rem" }}>{feature.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel" style={{ borderRadius: "var(--radius-sm)", padding: "clamp(1.1rem, 3vw, 1.6rem)", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
          <Sparkles size={22} color="var(--accent-blue)" />
          <h2 style={{ fontSize: "1.35rem" }}>Future Platform Modes</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
          <div style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "1rem", background: "rgba(0,0,0,0.16)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", marginBottom: "0.5rem" }}><FileSearch size={18} /> Public & Private Sharing</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>Invite-only access, roles, link expiration, download controls, QR codes, analytics and instant revocation.</p>
          </div>
          <div style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "1rem", background: "rgba(0,0,0,0.16)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", marginBottom: "0.5rem" }}><HardDrive size={18} /> Hybrid Storage</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>Users decide where files live while Zyphor keeps search, security and sharing consistent above the storage layer.</p>
          </div>
          <div style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "1rem", background: "rgba(0,0,0,0.16)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", marginBottom: "0.5rem" }}><Users size={18} /> Enterprise Mode</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>Teams see a unified workspace while admins retain control over providers, policies, storage health and audit trails.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
