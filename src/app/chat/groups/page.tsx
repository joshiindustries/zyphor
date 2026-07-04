import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Plus, Lock } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const groupMemberships = await prisma.groupMember.findMany({
    where: { user_id: sessionUser.id },
    include: {
      group: true
    },
    orderBy: { group: { updated_at: 'desc' } }
  });

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/chat" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Group Chat</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "var(--accent-purple)", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>E2EE Groups</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "320px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Your Groups</h2>
            <button className="btn btn-primary" style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} title="Create Group">
              <Plus size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {groupMemberships.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                <Users size={24} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <p style={{ fontSize: "0.9rem" }}>No groups yet.</p>
              </div>
            ) : (
              groupMemberships.map(gm => {
                const group = gm.group;
                return (
                  <div key={group.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background 0.2s" }} className="hover:bg-glass">
                    {group.avatar ? (
                      <img src={group.avatar} alt="Avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600" }}>
                        <Users size={20} color="#fff" />
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <h4 style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{group.name}</h4>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{group.description || "Encrypted group..."}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", padding: "2rem", textAlign: "center" }}>
            <Lock size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Secure Group Chat</h2>
            <p style={{ maxWidth: "400px", lineHeight: "1.5" }}>Select a group to start messaging. All group messages are encrypted with a rotating AES key known only to members.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
