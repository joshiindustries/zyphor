import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zyphor | E2E Encrypted Transfers",
  description: "Securely share files with end-to-end encryption. No size limits, completely private.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Providers } from "./providers";
import CookieConsentGate from "@/components/CookieConsentGate";
import CommandPalette from "@/components/CommandPalette";
import VaultSecurityManager from "@/components/VaultSecurityManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <CookieConsentGate />
          <CommandPalette />
          <VaultSecurityManager />
        </Providers>
      </body>
    </html>
  );
}
