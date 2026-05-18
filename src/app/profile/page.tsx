import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { prisma } from "@/lib/db";
import ProfileForm from "./ProfileForm";
import LinkAccountButton from "@/components/LinkAccountButton";

export default async function ProfilePage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    redirect("/login");
  }

  // Check linked accounts
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const linkedProviders = accounts.map((acc: { provider: string }) => acc.provider);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="Zyphor Logo" style={{ height: "32px", width: "auto" }} />
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor</h1></Link>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Back to Vault
        </Link>
      </header>

      <div style={{ flex: 1, padding: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <h2 className="title-gradient" style={{ fontSize: "2.5rem", fontWeight: "700" }}>Your Profile</h2>

        <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent-blue)" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "700" }}>
                {user.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "600" }}>{user.name || "Anonymous User"}</h3>
              <p style={{ color: "var(--text-secondary)" }}>{user.email}</p>
            </div>
          </div>

          <ProfileForm user={user} />
        </div>

        <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>Linked Accounts</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Connect your social accounts for easier login.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img src="https://authjs.dev/img/providers/google.svg" width="24" height="24" alt="Google" />
                <span style={{ fontWeight: "600" }}>Google</span>
              </div>
              <LinkAccountButton provider="google" isLinked={linkedProviders.includes("google")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img src="https://authjs.dev/img/providers/github.svg" width="24" height="24" alt="GitHub" style={{ filter: "invert(1)" }} />
                <span style={{ fontWeight: "600" }}>GitHub</span>
              </div>
              <LinkAccountButton provider="github" isLinked={linkedProviders.includes("github")} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--accent-purple)", background: "linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Crown color="var(--accent-purple)" size={24} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--accent-purple)" }}>Pro Subscription</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Upgrade to Pro for team sharing, larger file limits, and custom branding.</p>
          <button className="btn btn-primary" style={{ background: "transparent", border: "1px solid var(--accent-purple)", color: "var(--text-primary)", cursor: "not-allowed", opacity: 0.5 }}>
            Coming Soon
          </button>
        </div>

      </div>
    </main>
  );
}
