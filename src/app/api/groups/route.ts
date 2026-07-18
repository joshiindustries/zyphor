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

    const groupMemberships = await prisma.groupMember.findMany({
      where: { user_id: user.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, username: true, avatar: true } }
              }
            }
          }
        }
      },
      orderBy: { group: { updated_at: "desc" } }
    });

    const groups = groupMemberships.map((gm: any) => ({
      ...gm.group,
      encrypted_group_key: gm.encrypted_group_key,
      my_role: gm.role
    }));

    return noStoreJson({ success: true, groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, members } = await request.json();

    if (!name || typeof name !== "string") {
      return noStoreJson({ error: "Invalid group name" }, { status: 400 });
    }

    if (!Array.isArray(members) || members.length < 1) {
      return noStoreJson({ error: "Group must have members with encrypted keys" }, { status: 400 });
    }

    const normalizedMembers = Array.from(
      new Map(
        members
          .filter((member: any) => member && typeof member.user_id === "string")
          .map((member: any) => [
            member.user_id,
            {
              user_id: member.user_id,
              encrypted_group_key: String(member.encrypted_group_key || member.encrypted_key || "GROUP_KEY_PENDING"),
            },
          ])
      ).values()
    ) as Array<{ user_id: string; encrypted_group_key: string }>;

    if (!normalizedMembers.some((member) => member.user_id === user.id)) {
      normalizedMembers.push({ user_id: user.id, encrypted_group_key: "GROUP_KEY_PENDING" });
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: normalizedMembers.map((member) => member.user_id) } },
      select: { id: true }
    });
    const existingUserIds = new Set(existingUsers.map((existingUser: any) => existingUser.id));
    const validMembers = normalizedMembers.filter((member) => existingUserIds.has(member.user_id));

    if (validMembers.length < 2) {
      return noStoreJson({ error: "A group needs at least two valid members." }, { status: 400 });
    }

    const group = await prisma.$transaction(async (tx: any) => {
      const newGroup = await tx.group.create({
        data: {
          name: name.trim().slice(0, 120),
          description: typeof description === "string" && description.trim() ? description.trim().slice(0, 500) : null,
        }
      });

      await tx.groupMember.createMany({
        data: validMembers.map((member) => ({
          group_id: newGroup.id,
          user_id: member.user_id,
          encrypted_group_key: member.encrypted_group_key,
          role: member.user_id === user.id ? "ADMIN" : "MEMBER"
        }))
      });

      return tx.group.findUnique({
        where: { id: newGroup.id },
        include: { members: true }
      });
    });

    if (group) {
      await createNotifications(
        validMembers
          .filter((member) => member.user_id !== user.id)
          .map((member) => ({
            userId: member.user_id,
            type: "SYSTEM" as const,
            title: "Added to a group",
            body: `${user.name || user.email || "Someone"} added you to ${name.trim()}`,
            entityType: "group",
            entityId: group.id,
            link: `/chat?group=${group.id}`,
          }))
      );
    }

    return noStoreJson({ success: true, group });
  } catch (error) {
    console.error("Error creating group:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}