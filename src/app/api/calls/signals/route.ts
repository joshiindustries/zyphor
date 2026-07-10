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
    const call_id = searchParams.get("callId");
    const since = searchParams.get("since"); // ISO String or Timestamp

    if (!call_id) {
      return noStoreJson({ error: "callId required" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { id: call_id },
      include: { conversation: true }
    });

    if (!call || (call.conversation.user1_id !== user.id && call.conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Unauthorized" }, { status: 403 });
    }

    const whereClause: any = {
      call_id,
      sender_id: { not: user.id } // Only get signals from the other peer
    };

    if (since) {
      whereClause.created_at = { gt: new Date(since) };
    }

    const signals = await prisma.callSignal.findMany({
      where: whereClause,
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

    const call = await prisma.call.findUnique({
      where: { id: call_id },
      include: { conversation: true }
    });

    if (!call || (call.conversation.user1_id !== user.id && call.conversation.user2_id !== user.id)) {
      return noStoreJson({ error: "Unauthorized" }, { status: 403 });
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
    console.error("Error creating signal:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
