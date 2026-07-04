"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "zyphor_cookie_consent_v1";
const CONSENT_COOKIE_NAME = "zyphor_cookie_consent";
const CONSENT_ACCEPTED_VALUE = "accepted";

function hasAcceptedConsentInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .some((part) => part === `${CONSENT_COOKIE_NAME}=${CONSENT_ACCEPTED_VALUE}`);
}

function persistConsent(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ACCEPTED_VALUE);
  }

  if (typeof document !== "undefined") {
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE_NAME}=${CONSENT_ACCEPTED_VALUE}; Max-Age=31536000; Path=/; SameSite=Lax${secureFlag}`;
  }
}

export default function CookieConsentGate() {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const acceptedFromStorage =
      typeof window !== "undefined" &&
      localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_ACCEPTED_VALUE;

    const acceptedFromCookie = hasAcceptedConsentInCookie();
    const isAccepted = Boolean(acceptedFromStorage || acceptedFromCookie);

    setAccepted(isAccepted);
    setReady(true);
  }, []);

  if (!ready || accepted) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "640px",
          padding: "1.5rem",
          borderRadius: "var(--radius-md)",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.65rem" }}>
          Cookie Consent Required
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
          We use essential cookies for secure login sessions, security protections, and core site
          functionality. Please accept cookies to continue using Zyphor.
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.7rem" }}>
          By continuing, you agree to our{" "}
          <Link href="/policy" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
            Policy
          </Link>
          ,{" "}
          <Link href="/terms" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
            Terms
          </Link>
          , and{" "}
          <Link href="/license" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
            License
          </Link>
          . J Industries and Zyphor are not responsible for data theft, cyber attacks, or data loss.
        </p>
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              persistConsent();
              setAccepted(true);
            }}
          >
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
