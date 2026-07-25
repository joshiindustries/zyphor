import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf-shared";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_PROTECTED_PREFIXES = [
  "/api/upload",
  "/api/links",
  "/api/profile",
  "/api/webrtc",
  "/api/auth/register",
  "/api/tasks",
  "/api/calendars",
  "/api/vault",
  "/api/calls",
  "/api/groups",
  "/api/notes",
  "/api/chat",
  "/api/notifications",
  "/api/error-report",
  "/api/keys",
  "/api/passkeys",
  "/api/passwords",
];

function isCsrfProtectedPath(pathname: string): boolean {
  return CSRF_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasValidSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function newCsrfToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const shouldProtect = isCsrfProtectedPath(pathname) && !SAFE_METHODS.has(method);

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  if (shouldProtect) {
    if (!hasValidSameOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
  }

  const response = NextResponse.next();

  if (!csrfCookie) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: newCsrfToken(),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
