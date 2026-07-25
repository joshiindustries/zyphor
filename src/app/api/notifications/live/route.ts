import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

type LiveEvent = {
  id: string;
  kind: "CALL" | "MESSAGE" | "GROUP_MESSAGE";
  title: string;
  body: string;
  link: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  call?: unknown;
};

function getSinceDate(request: NextRequest): Date {
  const { searchParams } = new URL(request.url);
  const sinceParam = Number(searchParams.get("since"));
  if (Number.isFinite(sinceParam) && sinceParam > 0) {
    return new Date(Math.max(0, sinceParam - 1000));
  }

  const lookbackSeconds = Number(searchParams.get("lookbackSeconds") || 30);
  const boundedLookback = Number.isFinite(lookbackSeconds) ? Math.min(Math.max(lookbackSeconds, 5), 86400) : 30;
  return new Date(Date.now() - boundedLookback * 1000);
}

function cleanName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  return user?.name || user?.email || "Someone";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") || 30);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;
    const sinceDate = getSinceDate(request);

    const [calls, messages, groupMessages] = await Promise.all([
      prisma.call.findMany({
        where: {
          caller_id: { not: user.id },
          status: "RINGING",
          conversation: {
            OR: [{ user1_id: user.id }, { user2_id: user.id }],
          },
        },
        include: {
          caller: { select: { id: true, name: true, email: true, avatar: true } },
          conversation: true,
        },
        orderBy: { started_at: "desc" },
        take: 5,
      }),
      prisma.message.findMany({
        where: {
          sender_id: { not: user.id },
          created_at: { gte: sinceDate },
          conversation: {
            OR: [{ user1_id: user.id }, { user2_id: user.id }],
          },
        },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true } },
          conversation: true,
        },
        orderBy: { created_at: "desc" },
        take,
      }),
      prisma.groupMessage.findMany({
        where: {
          sender_id: { not: user.id },
          created_at: { gte: sinceDate },
          group: { members: { some: { user_id: user.id } } },
        },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        take,
      }),
    ]);

    const events: LiveEvent[] = [
      ...calls.map((call) => ({
        id: `call:${call.id}:${call.status}`,
        kind: "CALL" as const,
        title: `Incoming ${call.media_type === "AUDIO" ? "audio" : "video"} call`,
        body: `${cleanName(call.caller)} is calling you`,
        link: `/chat/call/${call.id}`,
        entity_type: "call",
        entity_id: call.id,
        created_at: call.started_at.toISOString(),
        call,
      })),
      ...messages.map((message) => ({
        id: `message:${message.id}`,
        kind: "MESSAGE" as const,
        title: "New direct message",
        body: `${cleanName(message.sender)} sent you a message`,
        link: `/chat?conversation=${message.conversation_id}`,
        entity_type: "conversation",
        entity_id: message.conversation_id,
        created_at: message.created_at.toISOString(),
      })),
      ...groupMessages.map((message) => ({
        id: `group-message:${message.id}`,
        kind: "GROUP_MESSAGE" as const,
        title: `New message in ${message.group.name}`,
        body: `${cleanName(message.sender)} sent a group message`,
        link: `/chat?group=${message.group_id}`,
        entity_type: "group",
        entity_id: message.group_id,
        created_at: message.created_at.toISOString(),
      })),
    ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

    return noStoreJson({ success: true, events: events.slice(0, take), serverTime: Date.now() });
  } catch (error) {
    console.error("Error loading live notifications:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}