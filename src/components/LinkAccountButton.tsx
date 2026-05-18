"use client";

import { signIn } from "next-auth/react";

export default function LinkAccountButton({ provider, isLinked }: { provider: string, isLinked: boolean }) {
  if (isLinked) {
    return (
      <span style={{ color: "#10b981", fontSize: "0.9rem", fontWeight: "600" }}>Connected</span>
    );
  }

  return (
    <button 
      onClick={() => signIn(provider, { callbackUrl: "/profile" })}
      className="btn btn-secondary" 
      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
    >
      Connect
    </button>
  );
}
