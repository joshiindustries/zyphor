import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { noStoreJson } from "@/lib/security";

/**
 * Simple Link Scanner API
 *
 * Expects JSON body: { url: string }
 * Returns:
 *   { success: true, safe: boolean, details: { finalUrl, status, redirects, protocol } }
 *   or error object.
 *
 * This runs on the server, so the request originates from Zyphor's backend, keeping the
 * user's IP hidden. It performs a lightweight HEAD request first; if the server does not
 * allow HEAD, it falls back to GET but only reads the first 1KB of the body.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return noStoreJson({ error: "Invalid URL" }, { status: 400 });
    }

    // Basic validation – must be a well‑formed absolute URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return noStoreJson({ error: "Malformed URL" }, { status: 400 });
    }

    const isHttps = parsed.protocol === "https:";
    const maxRedirects = 5;
    let redirects = 0;
    let currentUrl = parsed.href;
    let finalResponse: Response | null = null;
    let finalUrl = currentUrl;
    let status = 0;

    // Follow redirects manually up to maxRedirects
    while (redirects < maxRedirects) {
      const res = await fetch(currentUrl, { method: "HEAD", redirect: "manual" });
      status = res.status;
      if (status >= 300 && status < 400 && res.headers.get("location")) {
        const location = res.headers.get("location")!;
        currentUrl = new URL(location, currentUrl).href;
        redirects++;
        continue;
      }
      // Non‑redirect response – use it
      finalResponse = res;
      finalUrl = currentUrl;
      break;
    }

    // If we never got a response (e.g., too many redirects), fetch with GET as fallback
    if (!finalResponse) {
      const res = await fetch(currentUrl, { method: "GET", redirect: "manual" });
      status = res.status;
      finalResponse = res;
      finalUrl = currentUrl;
    }

    // Simple safety heuristics
    const safe = isHttps && status >= 200 && status < 400;

    return noStoreJson({
      success: true,
      safe,
      details: {
        finalUrl,
        status,
        redirects,
        protocol: new URL(finalUrl).protocol,
        https: isHttps
      }
    });
  } catch (error) {
    console.error("Error scanning link:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
