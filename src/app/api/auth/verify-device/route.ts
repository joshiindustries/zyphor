import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";
import { normalizeEmail } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, fingerprintHash, trustDevice, os, browser } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    // Find the OTP
    const validOtp = await prisma.deviceOtp.findFirst({
      where: {
        email: normalizedEmail,
        otp: otp,
        expires_at: { gt: new Date() }
      }
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 401 });
    }

    // Delete the OTP so it can't be used again
    await prisma.deviceOtp.delete({ where: { id: validOtp.id } });

    // Generate a secure device token
    const deviceToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(deviceToken).digest("hex");

    // Store in Trusted Devices
    await prisma.trustedDevice.create({
      data: {
        user_id: validOtp.user_id,
        device_id: tokenHash,
        device_token_hash: tokenHash,
        fingerprint_hash: fingerprintHash || "unknown",
        os: os || "Unknown OS",
        browser: browser || "Unknown Browser",
        trusted: true,
        expires_at: trustDevice ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days or session-only
      }
    });

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set("zyphor_device_token", deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: trustDevice ? 30 * 24 * 60 * 60 : undefined // 30 days or session cookie
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
