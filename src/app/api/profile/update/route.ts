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
    const hasDesktopBearer = /^Bearer\s+\S+$/.test(request.headers.get("authorization") || "");
    if (!isSameOrigin(request) && !hasDesktopBearer) {
      return noStoreJson({ error: "Invalid request origin" }, { status: 403 });
    }

    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await checkRateLimit(`${getClientIp(request)}:${user.id}`, "profile_update", 30, 5);
    if (!allowed) {
      return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { 
      name, dob, image,
      username, bio, theme_preference, language_preference,
      profile_visibility, online_status, show_last_seen, read_receipts
    } = await request.json();
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
    
    if (username !== undefined) {
      if (typeof username !== "string") return noStoreJson({ error: "Invalid username format." }, { status: 400 });
      const safeUsername = username.trim().toLowerCase();
      if (safeUsername && !/^[a-z0-9_]{3,20}$/.test(safeUsername)) {
        return noStoreJson({ error: "Username must be 3-20 characters, alphanumeric and underscores only." }, { status: 400 });
      }
      updateData.username = safeUsername || null;
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") return noStoreJson({ error: "Invalid bio format." }, { status: 400 });
      const safeBio = bio.trim().slice(0, 500);
      updateData.bio = safeBio || null;
    }

    if (theme_preference !== undefined) {
      if (typeof theme_preference !== "string" || !["light", "dark", "system"].includes(theme_preference)) {
        return noStoreJson({ error: "Invalid theme preference." }, { status: 400 });
      }
      updateData.theme_preference = theme_preference;
    }

    if (language_preference !== undefined) {
      if (typeof language_preference !== "string" || language_preference.length > 10) {
         return noStoreJson({ error: "Invalid language preference." }, { status: 400 });
      }
      updateData.language_preference = language_preference.trim();
    }

    if (profile_visibility !== undefined) {
      if (typeof profile_visibility !== "string" || !["public", "contacts", "private"].includes(profile_visibility)) {
         return noStoreJson({ error: "Invalid profile visibility." }, { status: 400 });
      }
      updateData.profile_visibility = profile_visibility;
    }

    if (online_status !== undefined) {
      if (typeof online_status !== "string" || !["online", "away", "dnd", "offline"].includes(online_status)) {
         return noStoreJson({ error: "Invalid online status." }, { status: 400 });
      }
      updateData.online_status = online_status;
    }

    if (show_last_seen !== undefined) {
      if (typeof show_last_seen !== "boolean") return noStoreJson({ error: "Invalid last seen toggle." }, { status: 400 });
      updateData.show_last_seen = show_last_seen;
    }

    if (read_receipts !== undefined) {
      if (typeof read_receipts !== "boolean") return noStoreJson({ error: "Invalid read receipts toggle." }, { status: 400 });
      updateData.read_receipts = read_receipts;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    return noStoreJson({ success: true, message: "Profile updated" });
  } catch (error: any) {
    console.error("Profile update error:", error);
    if (error?.code === "P2002" && error?.meta?.target?.includes("username")) {
      return noStoreJson({ error: "Username is already taken." }, { status: 400 });
    }
    if (isPrismaDatabaseConnectivityError(error)) {
      return noStoreJson({ error: databaseUnavailableMessage("Profile update") }, { status: 503 });
    }
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
