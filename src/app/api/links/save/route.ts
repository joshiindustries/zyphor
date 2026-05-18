import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin, isValidLinkId, noStoreJson } from "@/lib/security";
import { databaseUnavailableMessage, isPrismaDatabaseConnectivityError } from "@/lib/prisma-errors";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: "Invalid request origin" }, { status: 403 });
    }

    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { linkId } = await request.json();
    if (!linkId || !isValidLinkId(linkId)) {
      return noStoreJson({ error: "Valid link ID is required" }, { status: 400 });
    }

    const allowed = await checkRateLimit(`${getClientIp(request)}:${user.id}`, "save_link", 60, 5);
    if (!allowed) {
      return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const userId = user.id;

    // Check if the link exists
    const link = await prisma.link.findUnique({
      where: { id: linkId }
    });
    if (!link) {
      return noStoreJson({ error: "Link not found" }, { status: 404 });
    }

    // Check if already saved
    const existingSave = await prisma.savedLink.findUnique({
      where: {
        user_id_link_id: {
          user_id: userId,
          link_id: linkId
        }
      }
    });
      
    if (existingSave) {
      return noStoreJson({ success: true, message: "Already saved" });
    }

    // Save the link
    await prisma.savedLink.create({
      data: {
        user_id: userId,
        link_id: linkId,
      }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Save link error:", error);
    if (isPrismaDatabaseConnectivityError(error)) {
      return noStoreJson({ error: databaseUnavailableMessage("Save link") }, { status: 503 });
    }
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
