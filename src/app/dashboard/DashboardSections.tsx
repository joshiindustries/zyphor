"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, FileText, CheckSquare, Calendar, Video, Key, Folder, Shield, Box } from "lucide-react";
import LinkCard from "./LinkCard";

export default function DashboardSections({ links, savedLinks }: { links: any[], savedLinks: any[] }) {
  const [showAllSuite, setShowAllSuite] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [showAllSaved, setShowAllSaved] = useState(false);

  const suiteItems = [
    { href: "/dashboard/notes", icon: <FileText size={32} color="#e67e22" />, bg: "rgba(230, 126, 34, 0.1)", label: "Notes" },
    { href: "/dashboard/tasks", icon: <CheckSquare size={32} color="#3498db" />, bg: "rgba(52, 152, 219, 0.1)", label: "Tasks" },
    { href: "/dashboard/calendar", icon: <Calendar size={32} color="#9b59b6" />, bg: "rgba(155, 89, 182, 0.1)", label: "Calendar" },
    { href: "/chat", icon: <Video size={32} color="#2ecc71" />, bg: "rgba(46, 204, 113, 0.1)", label: "Meet & Chat" },
    { href: "/dashboard/setup-keys", icon: <Key size={32} color="#f1c40f" />, bg: "rgba(241, 196, 15, 0.1)", label: "Device Keys" },
    { href: "/dashboard/passwords", icon: <Key size={32} color="#e74c3c" />, bg: "rgba(231, 76, 60, 0.1)", label: "Passwords" },
    { href: "/dashboard/vault", icon: <Folder size={32} color="#10b981" />, bg: "rgba(16, 185, 129, 0.1)", label: "Cloud Vault" },
    { href: "/dashboard/security", icon: <Shield size={32} color="#8e44ad" />, bg: "rgba(142, 68, 173, 0.1)", label: "Security Center" },
    { href: "/dashboard/drop", icon: <Box size={32} color="#3b82f6" />, bg: "rgba(59, 130, 246, 0.1)", label: "Drop Inbox" },
  ];

  const visibleSuite = showAllSuite ? suiteItems : suiteItems.slice(0, 4);
  const visibleLinks = showAllLinks ? links : links.slice(0, 3);
  const visibleSaved = showAllSaved ? savedLinks : savedLinks.slice(0, 3);

  return (
    <>
      <section style={{ marginBottom: "4rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Zyphor Suite</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {visibleSuite.map((item, idx) => (
            <Link key={idx} href={item.href} className="glass-panel" style={{ textDecoration: "none", color: "inherit", padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
              <div style={{ background: item.bg, padding: "1rem", borderRadius: "50%" }}>
                {item.icon}
              </div>
              <span style={{ fontWeight: "600" }}>{item.label}</span>
            </Link>
          ))}
        </div>
        {suiteItems.length > 4 && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button onClick={() => setShowAllSuite(!showAllSuite)} className="btn btn-secondary">
              {showAllSuite ? "View Less" : "View More Apps"}
            </button>
          </div>
        )}
      </section>

      <div className="dashboard-title-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
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
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {visibleLinks.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
            {links.length > 3 && (
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button onClick={() => setShowAllLinks(!showAllLinks)} className="btn btn-secondary">
                  {showAllLinks ? "View Less" : `View All Transfers (${links.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-secondary)" }}>Saved Files</h3>
        {savedLinks.length === 0 ? (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
            <p style={{ color: "var(--text-secondary)" }}>You haven't saved any files yet.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {visibleSaved.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
            {savedLinks.length > 3 && (
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button onClick={() => setShowAllSaved(!showAllSaved)} className="btn btn-secondary">
                  {showAllSaved ? "View Less" : `View All Saved (${savedLinks.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
