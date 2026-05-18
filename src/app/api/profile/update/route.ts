import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin, isValidDateOnly, noStoreJson } from "@/lib/security";
import { databaseUnavailableMessage, isPrismaDatabaseConnectivityError } from "@/lib/prisma-errors";

function isSafeAvatarInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:image/")) {
    return trimmed.includes(";base64,") && trimmed.length <= 2_800_000;
  }

  try {
    const url = new URL(trimmed);
    return (url.protocol === "https:" || url.protocol === "http:") && trimmed.length <= 2048;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: "Invalid request origin" }, { status: 403 });
    }

    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await checkRateLimit(`${getClientIp(request)}:${user.id}`, "profile_update", 30, 5);
    if (!allowed) {
      return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { name, dob, image } = await request.json();
    const userId = user.id;

    // Update user in DB
    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== "string") {
        return noStoreJson({ error: "Invalid name format." }, { status: 400 });
      }
      const safeName = name.trim().slice(0, 80);
      updateData.name = safeName || null;
    }

    if (dob !== undefined) {
      if (typeof dob !== "string") {
        return noStoreJson({ error: "Invalid date of birth format." }, { status: 400 });
      }
      const safeDob = dob.trim();
      if (safeDob && !isValidDateOnly(safeDob)) {
        return noStoreJson({ error: "Date of birth must be in YYYY-MM-DD format." }, { status: 400 });
      }
      updateData.dob = safeDob || null;
    }

    if (image !== undefined) {
      if (typeof image !== "string") {
        return noStoreJson({ error: "Invalid profile image format." }, { status: 400 });
      }
      const safeImage = image.trim();
      if (!isSafeAvatarInput(safeImage)) {
        return noStoreJson({ error: "Invalid profile image value." }, { status: 400 });
      }
      updateData.avatar = safeImage || null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    return noStoreJson({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Profile update error:", error);
    if (isPrismaDatabaseConnectivityError(error)) {
      return noStoreJson({ error: databaseUnavailableMessage("Profile update") }, { status: 503 });
    }
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
