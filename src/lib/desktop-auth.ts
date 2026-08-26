import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

type DesktopClaims = { sub: string; exp: number; aud: "zyphor-desktop"; version: 1 };
type DesktopCodeClaims = { sub: string; exp: number; aud: "zyphor-desktop-code"; redirect: string; challenge: string; version: 1 };

function secret(): string | null {
  const value = process.env.DESKTOP_AUTH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function encode(value: Buffer | string) { return Buffer.from(value).toString("base64url"); }
function sign(value: string) { return crypto.createHmac("sha256", secret()!).update(value).digest("base64url"); }

export function issueDesktopToken(userId: string): string | null {
  if (!secret()) return null;
  const payload: DesktopClaims = { sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, aud: "zyphor-desktop", version: 1 };
  const content = `${encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${encode(JSON.stringify(payload))}`;
  return `${content}.${sign(content)}`;
}

export function issueDesktopCode(userId: string, redirect: string, challenge: string): string | null {
  if (!secret()) return null;
  const payload: DesktopCodeClaims = { sub: userId, redirect, challenge, exp: Math.floor(Date.now() / 1000) + 120, aud: "zyphor-desktop-code", version: 1 };
  const content = `${encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${encode(JSON.stringify(payload))}`;
  return `${content}.${sign(content)}`;
}

export function redeemDesktopCode(code: string, redirect: string, verifier: string): string | null {
  const parts = code.split(".");
  if (parts.length !== 3 || !secret()) return null;
  const content = `${parts[0]}.${parts[1]}`; const supplied = Buffer.from(parts[2]); const expected = Buffer.from(sign(content));
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as DesktopCodeClaims;
    const derived = crypto.createHash("sha256").update(verifier).digest("base64url");
    if (claims.aud !== "zyphor-desktop-code" || claims.version !== 1 || claims.exp <= Math.floor(Date.now() / 1000) || claims.redirect !== redirect || !crypto.timingSafeEqual(Buffer.from(claims.challenge), Buffer.from(derived))) return null;
    return issueDesktopToken(claims.sub);
  } catch { return null; }
}

export async function getDesktopUser(request: NextRequest | Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const parts = token.split(".");
  if (parts.length !== 3 || !secret()) return null;
  const content = `${parts[0]}.${parts[1]}`;
  const supplied = Buffer.from(parts[2]);
  const expected = Buffer.from(sign(content));
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as DesktopClaims;
    if (claims.aud !== "zyphor-desktop" || claims.version !== 1 || !claims.sub || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return await prisma.user.findUnique({ where: { id: claims.sub } });
  } catch { return null; }
}
