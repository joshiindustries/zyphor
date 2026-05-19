import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";
import LinkCard from "./LinkCard";
import LogoutButton from "@/components/LogoutButton";
import UserAvatar from "@/components/UserAvatar";
import SiteFooter from "@/components/SiteFooter";

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
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
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

      <div style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700" }}>Your Vault</h2>
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
