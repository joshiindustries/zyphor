import { NextRequest } from "next/server";
import { redeemDesktopCode } from "@/lib/desktop-auth";
import { noStoreJson } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri, codeVerifier } = await request.json();
    if (typeof code !== "string" || typeof redirectUri !== "string" || typeof codeVerifier !== "string") return noStoreJson({ error: "Invalid authorization exchange." }, { status: 400 });
    const token = redeemDesktopCode(code, redirectUri, codeVerifier);
    if (!token) return noStoreJson({ error: "Authorization code is invalid or expired." }, { status: 401 });
    return noStoreJson({ success: true, token, expiresIn: 604800 });
  } catch { return noStoreJson({ error: "Authorization exchange failed." }, { status: 400 }); }
}
