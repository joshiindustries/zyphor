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
    const { encrypted_content, is_deleted, reactions, burn_after_view } = await request.json();

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) return noStoreJson({ error: "Message not found" }, { status: 404 });

    if (message.conversation.user1_id !== user.id && message.conversation.user2_id !== user.id) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    const updates: any = {};

    if (is_deleted !== undefined) {
      const isBurnerDelete = is_deleted === true && message.burn_after_view === true && burn_after_view === true;
      if (message.sender_id !== user.id && !isBurnerDelete) {
        return noStoreJson({ error: "Forbidden" }, { status: 403 });
      }
      updates.is_deleted = Boolean(is_deleted);
      if (is_deleted) {
        updates.encrypted_content = "ENC_DELETED";
        updates.burned_at = new Date();
      }
    }

    if (encrypted_content !== undefined && is_deleted === undefined) {
      if (message.sender_id !== user.id) return noStoreJson({ error: "Forbidden" }, { status: 403 });
      updates.encrypted_content = encrypted_content;
      updates.is_edited = true;
    }

    if (reactions !== undefined) {
      updates.reactions = reactions;
    }

    if (Object.keys(updates).length === 0) {
      return noStoreJson({ error: "No updates provided" }, { status: 400 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updates
    });

    return noStoreJson({ success: true, message: updatedMessage });
  } catch (error) {
    console.error("Error updating message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}