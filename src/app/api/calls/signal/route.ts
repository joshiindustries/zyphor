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
    const callId = searchParams.get("callId");

    if (!callId) {
      return noStoreJson({ error: "callId required" }, { status: 400 });
    }

    // Verify user is part of the call
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { conversation: true }
    });

    if (!call || (call.conversation.user1_id !== user.id && call.conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Call not found" }, { status: 404 });
    }

    const signals = await prisma.callSignal.findMany({
      where: { call_id: callId },
      orderBy: { created_at: "asc" }
    });

    return noStoreJson({ success: true, signals });
  } catch (error) {
    console.error("Error fetching signals:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { call_id, type, payload } = await request.json();

    if (!call_id || !type || !payload) {
      return noStoreJson({ error: "Missing fields" }, { status: 400 });
    }

    // Verify user is part of the call
    const call = await prisma.call.findUnique({
      where: { id: call_id },
      include: { conversation: true }
    });

    if (!call || (call.conversation.user1_id !== user.id && call.conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Call not found" }, { status: 404 });
    }

    const signal = await prisma.callSignal.create({
      data: {
        call_id,
        sender_id: user.id,
        type,
        payload: JSON.stringify(payload)
      }
    });

    return noStoreJson({ success: true, signal });
  } catch (error) {
    console.error("Error posting signal:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
