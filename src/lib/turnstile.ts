import { getClientIp } from "@/lib/security";
import { NextRequest } from "next/server";

export function shouldEnforceTurnstile(): boolean {
  if (process.env.TURNSTILE_ENFORCE === "true") return true;
  if (process.env.TURNSTILE_ENFORCE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  if (!shouldEnforceTurnstile()) return true;
  if (typeof token !== "string" || !token.trim()) return false;

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is missing.");
    return false;
  }

  const formData = new URLSearchParams();
  formData.append("secret", secretKey);
  formData.append("response", token.trim());
  if (ip && ip !== "unknown") formData.append("remoteip", ip);

  try {
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!verifyRes.ok) return false;
    const verifyData = await verifyRes.json();
    return Boolean(verifyData?.success);
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

export async function verifyTurnstileFromRequest(token: unknown, request: NextRequest): Promise<boolean> {
  return verifyTurnstile(token, getClientIp(request));
}
