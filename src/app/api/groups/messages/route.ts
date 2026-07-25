import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
import { createNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

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

    const { group_id, encrypted_content, reply_to_id, burn_after_view } = await request.json();

    if (!group_id || !encrypted_content || typeof encrypted_content !== "string") {
      return noStoreJson({ error: "Invalid payload" }, { status: 400 });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id, user_id: user.id } },
      include: { group: { include: { members: true } } }
    });

    if (!membership) {
      return noStoreJson({ error: "Group not found or access denied" }, { status: 404 });
    }

    if (reply_to_id) {
      const parent = await prisma.groupMessage.findUnique({ where: { id: reply_to_id } });
      if (!parent || parent.group_id !== group_id) {
        return noStoreJson({ error: "Invalid reply target" }, { status: 400 });
      }
    }

    const message = await prisma.groupMessage.create({
      data: {
        group_id,
        sender_id: user.id,
        encrypted_content,
        reply_to_id: reply_to_id || null,
        burn_after_view: Boolean(burn_after_view),
      }
    });

    await prisma.group.update({
      where: { id: group_id },
      data: { updated_at: new Date() }
    });

    await createNotifications(
      membership.group.members
        .filter((member: any) => member.user_id !== user.id)
        .map((member: any) => ({
          userId: member.user_id,
          type: "GROUP_MESSAGE" as const,
          title: `New message in ${membership.group.name}`,
          body: `${user.name || user.email || "Someone"} sent a group message`,
          entityType: "group",
          entityId: group_id,
          link: `/chat?group=${group_id}`,
        }))
    );

    return noStoreJson({ success: true, message });
  } catch (error) {
    console.error("Error sending group message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}