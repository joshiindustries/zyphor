import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { issueDesktopCode } from "@/lib/desktop-auth";
import { noStoreJson } from "@/lib/security";

/** Completes a browser OAuth session into a PKCE-bound desktop authorization code. */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const { redirectUri, codeChallenge } = await request.json();
    if (!user) return noStoreJson({ error: "Sign in was not completed." }, { status: 401 });
    if (typeof redirectUri !== "string" || typeof codeChallenge !== "string" || !/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}\/callback$/.test(redirectUri) || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) return noStoreJson({ error: "Invalid desktop callback request." }, { status: 400 });
    const code = issueDesktopCode(user.id, redirectUri, codeChallenge);
    if (!code) return noStoreJson({ error: "Desktop authentication is not configured." }, { status: 503 });
    return noStoreJson({ success: true, code });
  } catch { return noStoreJson({ error: "Could not complete desktop sign-in." }, { status: 500 }); }
}
