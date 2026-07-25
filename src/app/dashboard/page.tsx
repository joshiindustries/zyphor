import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import UserAvatar from "@/components/UserAvatar";
import SiteFooter from "@/components/SiteFooter";
import DashboardSections from "./DashboardSections";
import { passwordEntriesAfterResetWhere } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

type DashboardStats = {
  notes: number;
  taskBoards: number;
  calendars: number;
  passwords: number;
  deviceKeys: number;
  passkeys: number;
  trustedDevices: number;
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

  const [notes, taskBoards, calendars, passwords, deviceKeys, passkeys, trustedDevices] = await Promise.all([
    prisma.note.count({ where: { user_id: user.id } }),
    prisma.taskBoard.count({ where: { user_id: user.id } }),
    prisma.eventCalendar.count({ where: { user_id: user.id } }),
    prisma.passwordEntry.count({ where: { user_id: user.id, ...passwordEntriesAfterResetWhere() } }),
    prisma.userKey.count({ where: { user_id: user.id } }),
    prisma.passkeyCredential.count({ where: { user_id: user.id } }),
    prisma.trustedDevice.count({ where: { user_id: user.id, trusted: true } }),
  ]);

  const stats: DashboardStats = {
    notes,
    taskBoards,
    calendars,
    passwords,
    deviceKeys,
    passkeys,
    trustedDevices,
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="main-header" style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="Zyphor Logo" style={{ height: "32px", width: "auto" }} />
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Cloud</h1></Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/profile" className="btn btn-secondary" style={{ padding: "0.5rem 0.85rem", border: "1px solid var(--glass-border)", background: "transparent", display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            <UserAvatar user={profileUser} />
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>Profile</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div style={{ flex: 1, padding: "clamp(1rem, 4vw, 2rem)", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        <DashboardSections userName={profileUser.name || profileUser.email || "there"} stats={stats} />
      </div>
      <SiteFooter />
    </main>
  );
}
