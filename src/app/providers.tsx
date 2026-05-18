"use client";

import { SessionProvider } from "next-auth/react";
import SessionCloseLogout from "@/components/SessionCloseLogout";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionCloseLogout />
      {children}
    </SessionProvider>
  );
}
