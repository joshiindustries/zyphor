import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return noStoreJson({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || (conversation.user1_id !== user.id && conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Conversation not found or access denied" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: "asc" }
    });

    return noStoreJson({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversation_id, encrypted_content } = await request.json();

    if (!conversation_id || !encrypted_content || typeof encrypted_content !== "string") {
      return noStoreJson({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversation_id }
    });

    if (!conversation || (conversation.user1_id !== user.id && conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Conversation not found or access denied" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        conversation_id,
        sender_id: user.id,
        encrypted_content
      }
    });

    // Update conversation updated_at for sorting
    await prisma.conversation.update({
      where: { id: conversation_id },
      data: { updated_at: new Date() }
    });

    return noStoreJson({ success: true, message });
  } catch (error) {
    console.error("Error sending message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return noStoreJson({ error: "Message ID is required" }, { status: 400 });
    }

    // Must verify the user has access to this message's conversation
    const message = await prisma.message.findUnique({
      where: { id },
      include: { conversation: true }
    });

    if (!message) {
      return noStoreJson({ error: "Message not found" }, { status: 404 });
    }

    if (message.conversation.user1_id !== user.id && message.conversation.user2_id !== user.id) {
      return noStoreJson({ error: "Access denied" }, { status: 403 });
    }

    await prisma.message.delete({
      where: { id }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
