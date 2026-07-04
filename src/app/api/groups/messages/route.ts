import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return noStoreJson({ error: "groupId is required" }, { status: 400 });
    }

    // Verify user is part of the group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: user.id } }
    });

    if (!membership) {
      return noStoreJson({ error: "Group not found or access denied" }, { status: 404 });
    }

    const messages = await prisma.groupMessage.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: "asc" }
    });

    return noStoreJson({ success: true, messages });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { group_id, encrypted_content } = await request.json();

    if (!group_id || !encrypted_content || typeof encrypted_content !== "string") {
      return noStoreJson({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify user is part of the group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: group_id, user_id: user.id } }
    });

    if (!membership) {
      return noStoreJson({ error: "Group not found or access denied" }, { status: 404 });
    }

    const message = await prisma.groupMessage.create({
      data: {
        group_id,
        sender_id: user.id,
        encrypted_content
      }
    });

    // Update group updated_at for sorting
    await prisma.group.update({
      where: { id: group_id },
      data: { updated_at: new Date() }
    });

    return noStoreJson({ success: true, message });
  } catch (error) {
    console.error("Error sending group message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
