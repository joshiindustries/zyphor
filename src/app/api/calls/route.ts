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

    // Get active calls for user's conversations
    const calls = await prisma.call.findMany({
      where: {
        conversation: {
          OR: [
            { user1_id: user.id },
            { user2_id: user.id }
          ]
        },
        status: { in: ["RINGING", "ONGOING"] }
      },
      include: {
        caller: { select: { id: true, name: true, avatar: true } },
        conversation: true
      },
      orderBy: { started_at: "desc" }
    });

    return noStoreJson({ success: true, calls });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversation_id } = await request.json();

    if (!conversation_id) {
      return noStoreJson({ error: "conversation_id required" }, { status: 400 });
    }

    // Ensure user is in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversation_id }
    });

    if (!conversation || (conversation.user1_id !== user.id && conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Invalid conversation" }, { status: 400 });
    }

    // Check if there's already an active call
    const activeCall = await prisma.call.findFirst({
      where: {
        conversation_id,
        status: { in: ["RINGING", "ONGOING"] }
      }
    });

    if (activeCall) {
      return noStoreJson({ error: "Call already active" }, { status: 400 });
    }

    const call = await prisma.call.create({
      data: {
        conversation_id,
        caller_id: user.id,
        status: "RINGING"
      }
    });

    return noStoreJson({ success: true, call });
  } catch (error) {
    console.error("Error initiating call:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { call_id, status } = await request.json();
    if (!call_id || !status) {
      return noStoreJson({ error: "call_id and status required" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { id: call_id },
      include: { conversation: true }
    });

    if (!call || (call.conversation.user1_id !== user.id && call.conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Call not found" }, { status: 404 });
    }

    const updatedCall = await prisma.call.update({
      where: { id: call_id },
      data: {
        status,
        ended_at: ["ENDED", "MISSED", "REJECTED"].includes(status) ? new Date() : null
      }
    });

    return noStoreJson({ success: true, call: updatedCall });
  } catch (error) {
    console.error("Error updating call:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
