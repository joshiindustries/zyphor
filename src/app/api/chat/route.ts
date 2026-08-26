import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all conversations where user is user1 or user2
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1_id: user.id },
          { user2_id: user.id }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, username: true, avatar: true } },
        user2: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    return noStoreJson({ success: true, conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { target_user_id } = await request.json();
    if (!target_user_id || typeof target_user_id !== "string") {
      return noStoreJson({ error: "Invalid target_user_id" }, { status: 400 });
    }

    if (target_user_id === user.id) {
      return noStoreJson({ error: "Cannot create conversation with yourself" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: target_user_id } });
    if (!targetUser) {
      return noStoreJson({ error: "Target user not found" }, { status: 404 });
    }

    // Check if conversation already exists (order independent)
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1_id: user.id, user2_id: target_user_id },
          { user1_id: target_user_id, user2_id: user.id }
        ]
      }
    });

    if (existing) {
      return noStoreJson({ success: true, conversation: existing });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        user1_id: user.id,
        user2_id: target_user_id
      },
      include: {
        user1: { select: { id: true, name: true, username: true, avatar: true } },
        user2: { select: { id: true, name: true, username: true, avatar: true } },
      }
    });

    return noStoreJson({ success: true, conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
