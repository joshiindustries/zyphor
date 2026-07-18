"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import InstallAssistant from "@/components/InstallAssistant";

const BROWSER_ALLOWED_PATHS = [
  "/",
  "/install",
  "/login",
  "/register",
  "/policy",
  "/terms",
  "/license",
  "/help/errors",
];

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    document.referrer.includes("android-app://");
}

function canRenderInBrowser(pathname: string | null): boolean {
  if (!pathname) return false;
  return BROWSER_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AppEnforcer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => setIsStandalone(isStandaloneDisplay());

    checkStandalone();
    media.addEventListener("change", checkStandalone);

    return () => {
      media.removeEventListener("change", checkStandalone);
    };
  }, []);

  if (!isStandalone && !canRenderInBrowser(pathname)) {
    return <InstallAssistant enforced />;
  }

  return <>{children}</>;
}
