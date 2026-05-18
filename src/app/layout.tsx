import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zyphor | E2E Encrypted Transfers",
  description: "Securely share files with end-to-end encryption. No size limits, completely private.",
};

import { Providers } from "./providers";
import CookieConsentGate from "@/components/CookieConsentGate";

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
        </Providers>
      </body>
    </html>
  );
}
