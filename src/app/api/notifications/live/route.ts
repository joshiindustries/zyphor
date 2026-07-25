import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;

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
  const boundedLookback = Number.isFinite(lookbackSeconds) ? Math.min(Math.max(lookbackSeconds, 5), 3600) : 30;
  return new Date(Date.now() - boundedLookback * 1000);
}

function cleanName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  return user?.name || user?.email || "Someone";
}

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}\n${error.message}\n${error.stack || ""}`;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isPoolExhausted(error: unknown): boolean {
  const text = errorText(error);
  return text.includes("EMAXCONNSESSION") || text.includes("max clients reached") || text.includes("too many clients");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const sinceDate = getSinceDate(request);

    // Keep these sequential. Supabase session pooling is tight, and parallel
    // Prisma queries can consume several sessions for one notification poll.
    const calls = await prisma.call.findMany({
      where: {
        caller_id: { not: user.id },
        status: "RINGING",
        conversation: {
          OR: [{ user1_id: user.id }, { user2_id: user.id }],
        },
      },
      select: {
        id: true,
        status: true,
        media_type: true,
        started_at: true,
        caller: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { started_at: "desc" },
      take: 3,
    });

    const messages = await prisma.message.findMany({
      where: {
        sender_id: { not: user.id },
        created_at: { gte: sinceDate },
        conversation: {
          OR: [{ user1_id: user.id }, { user2_id: user.id }],
        },
      },
      select: {
        id: true,
        conversation_id: true,
        created_at: true,
        sender: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { created_at: "desc" },
      take,
    });

    const groupMessages = await prisma.groupMessage.findMany({
      where: {
        sender_id: { not: user.id },
        created_at: { gte: sinceDate },
        group: { members: { some: { user_id: user.id } } },
      },
      select: {
        id: true,
        group_id: true,
        created_at: true,
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take,
    });

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
    if (isPoolExhausted(error)) {
      console.warn("Live notifications degraded: database pool exhausted.");
      return noStoreJson({ success: true, events: [], serverTime: Date.now(), degraded: true, reason: "db_pool_busy" });
    }

    console.error("Error loading live notifications:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}