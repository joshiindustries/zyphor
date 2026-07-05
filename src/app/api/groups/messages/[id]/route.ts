import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const messageId = params.id;
    const { encrypted_content, is_deleted, reactions } = await request.json();

    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: { group: { include: { members: true } } }
    });

    if (!message) return noStoreJson({ error: "Message not found" }, { status: 404 });

    // Verify user is in the group
    const isMember = message.group.members.some(m => m.user_id === user.id);
    if (!isMember) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    const updates: any = {};

    if (is_deleted !== undefined) {
      if (message.sender_id !== user.id) return noStoreJson({ error: "Forbidden" }, { status: 403 });
      updates.is_deleted = is_deleted;
      updates.encrypted_content = "ENC_DELETED"; // Tombstone
    }

    if (encrypted_content !== undefined && is_deleted === undefined) {
      if (message.sender_id !== user.id) return noStoreJson({ error: "Forbidden" }, { status: 403 });
      updates.encrypted_content = encrypted_content;
      updates.is_edited = true;
    }

    if (reactions !== undefined) {
      // Anyone in group can react
      updates.reactions = reactions;
    }

    if (Object.keys(updates).length === 0) {
      return noStoreJson({ error: "No updates provided" }, { status: 400 });
    }

    const updatedMessage = await prisma.groupMessage.update({
      where: { id: messageId },
      data: updates
    });

    return noStoreJson({ success: true, message: updatedMessage });
  } catch (error) {
    console.error("Error updating group message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
