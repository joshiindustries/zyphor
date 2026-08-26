import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { issueDesktopCode, issueDesktopToken } from "@/lib/desktop-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, isValidEmail, noStoreJson, normalizeEmail } from "@/lib/security";
import { getNameFromSupabaseUser, isSupabaseAuthConfigured, supabaseSignInWithPassword } from "@/lib/supabase-auth";

async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  if (process.env.TURNSTILE_ENFORCE === "false") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || !token) return false;
  const form = new URLSearchParams({ secret, response: token, remoteip: ip });
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  if (!result.ok) return false;
  const data = await result.json();
  return data?.success === true;
}

/** Native-client login. Requires Cloudflare Turnstile and Supabase credentials; never returns a service credential. */
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password, turnstileToken, redirectUri, codeChallenge } = await request.json();
    const email = normalizeEmail(typeof rawEmail === "string" ? rawEmail : "");
    const ip = getClientIp(request);
    if (!isValidEmail(email) || typeof password !== "string" || !password || password.length > 1024) return noStoreJson({ error: "Invalid email or password." }, { status: 400 });
    if (!(await checkRateLimit(`${ip}:${email}`, "desktop_login", 5, 15))) return noStoreJson({ error: "Too many login attempts. Try again later." }, { status: 429 });
    if (!(await verifyTurnstile(turnstileToken, ip))) return noStoreJson({ error: "CAPTCHA validation failed." }, { status: 403 });
    if (!isSupabaseAuthConfigured()) return noStoreJson({ error: "Authentication is temporarily unavailable." }, { status: 503 });
    const result = await supabaseSignInWithPassword({ email, password, captchaToken: turnstileToken });
    if (!result.ok) return noStoreJson({ error: result.error || "Invalid credentials." }, { status: result.status || 401 });
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) user = await prisma.user.create({ data: { email, name: getNameFromSupabaseUser(result.user) } });
    if (redirectUri !== undefined || codeChallenge !== undefined) {
      if (typeof redirectUri !== "string" || typeof codeChallenge !== "string" || !/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}\/callback$/.test(redirectUri) || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) return noStoreJson({ error: "Invalid desktop callback request." }, { status: 400 });
      const code = issueDesktopCode(user.id, redirectUri, codeChallenge);
      if (!code) return noStoreJson({ error: "Desktop authentication is not configured." }, { status: 503 });
      return noStoreJson({ success: true, code, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
    }
    const token = issueDesktopToken(user.id);
    if (!token) return noStoreJson({ error: "Desktop authentication is not configured." }, { status: 503 });
    return noStoreJson({ success: true, token, expiresIn: 604800, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch { return noStoreJson({ error: "Authentication service unavailable." }, { status: 503 }); }
}
