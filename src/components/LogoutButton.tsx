"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })} 
      className="btn btn-secondary" 
      style={{ padding: "0.5rem 1rem" }}
    >
      <LogOut size={16} /> Logout
    </button>
  );
}
