import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf-shared";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}

export function withCsrfHeaders(initial?: HeadersInit): Headers {
  const headers = new Headers(initial || {});
  const token = getCsrfToken();
  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  return headers;
}
