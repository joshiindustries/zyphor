import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, FileText, CheckSquare, Calendar, Video, Key, Folder, Shield, Box } from "lucide-react";
import LinkCard from "./LinkCard";
import LogoutButton from "@/components/LogoutButton";
import UserAvatar from "@/components/UserAvatar";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

type DashboardLinkBase = {
  id: string;
  current_downloads: number;
  max_downloads: number;
  created_at: Date | string;
  expires_at: Date | string;
  allow_save: number;
  auth_required: number;
  [key: string]: unknown;
};

type DashboardLinkWithCount = DashboardLinkBase & {
  _count: {
    saved_by: number;
  };
};

type DashboardLink = DashboardLinkBase & {
  save_count: number;
};

type SavedLinkRow = {
  link: DashboardLinkBase;
  saved_at: Date | string;
};

type SavedDashboardLink = DashboardLinkBase & {
  saved_at: Date | string;
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });

  const profileUser = {
    id: dbUser?.id || user.id,
    name: dbUser?.name || user.name || null,
    email: dbUser?.email || user.email || "",
    image: dbUser?.avatar || user.image || null,
    avatar: dbUser?.avatar || user.image || null,
  };

  // Fetch user links with save count
  const linksRaw = await prisma.link.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { saved_by: true }
      }
    }
  }) as DashboardLinkWithCount[];
    
  const links: DashboardLink[] = linksRaw.map((link: DashboardLinkWithCount) => {
    const { _count, ...rest } = link;
    return {
      ...rest,
      save_count: _count.saved_by
    };
  });

  // Fetch saved links
  const savedLinksRaw = await prisma.savedLink.findMany({
    where: { user_id: user.id },
    orderBy: { saved_at: 'desc' },
    include: { link: true }
  }) as SavedLinkRow[];
  
  const savedLinks: SavedDashboardLink[] = savedLinksRaw.map((saved: SavedLinkRow) => ({
    ...saved.link,
    saved_at: saved.saved_at
  }));

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="main-header" style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="Zyphor Logo" style={{ height: "32px", width: "auto" }} />
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor</h1></Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/profile" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <UserAvatar user={profileUser} />
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>My Profile</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div style={{ flex: 1, padding: "clamp(1rem, 4vw, 2rem)", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Zyphor Suite</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <Link href="/dashboard/notes" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(230, 126, 34, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <FileText size={32} color="#e67e22" />
              </div>
              <span style={{ fontWeight: "600" }}>Notes</span>
            </Link>
            <Link href="/dashboard/tasks" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(52, 152, 219, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <CheckSquare size={32} color="#3498db" />
              </div>
              <span style={{ fontWeight: "600" }}>Tasks</span>
            </Link>
            <Link href="/dashboard/calendar" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(155, 89, 182, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Calendar size={32} color="#9b59b6" />
              </div>
              <span style={{ fontWeight: "600" }}>Calendar</span>
            </Link>
            <Link href="/chat" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(46, 204, 113, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Video size={32} color="#2ecc71" />
              </div>
              <span style={{ fontWeight: "600" }}>Meet & Chat</span>
            </Link>
            <Link href="/dashboard/setup-keys" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(241, 196, 15, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Key size={32} color="#f1c40f" />
              </div>
              <span style={{ fontWeight: "600" }}>Device Keys</span>
            </Link>
            <Link href="/dashboard/passwords" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(231, 76, 60, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Key size={32} color="#e74c3c" />
              </div>
              <span style={{ fontWeight: "600" }}>Passwords</span>
            </Link>
            <Link href="/dashboard/vault" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Folder size={32} color="#10b981" />
              </div>
              <span style={{ fontWeight: "600" }}>Cloud Vault</span>
            </Link>
            <Link href="/dashboard/security" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(142, 68, 173, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Shield size={32} color="#8e44ad" />
              </div>
              <span style={{ fontWeight: "600" }}>Security Center</span>
            </Link>
            <Link href="/dashboard/drop" className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "1rem", borderRadius: "50%" }}>
                <Box size={32} color="#3b82f6" />
              </div>
              <span style={{ fontWeight: "600" }}>Drop Inbox</span>
            </Link>
          </div>
        </section>

        <div className="dashboard-title-bar">
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>Secure Transfers</h2>
          <Link href="/" className="btn btn-primary">+ New Transfer</Link>
        </div>

        <section style={{ marginBottom: "4rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-secondary)" }}>My Shared Files</h3>
          {links.length === 0 ? (
            <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
              <Globe size={48} style={{ color: "var(--glass-border)", margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>No active transfers</h3>
              <p style={{ color: "var(--text-secondary)" }}>Your shared files will appear here securely.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {links.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-secondary)" }}>Saved Files</h3>
          {savedLinks.length === 0 ? (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
              <p style={{ color: "var(--text-secondary)" }}>You haven't saved any files yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {savedLinks.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
