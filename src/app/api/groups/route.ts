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

    // Fetch groups user is a member of
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
      orderBy: { group: { updated_at: 'desc' } }
    });

    const groups = groupMemberships.map(gm => ({
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

    // Ensure the creator is in the members list
    const creatorMember = members.find((m: any) => m.user_id === user.id);
    if (!creatorMember) {
      return noStoreJson({ error: "Creator must be in the members list" }, { status: 400 });
    }

    // Create the group and members in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name,
          description: description || null,
        }
      });

      const memberData = members.map((m: any) => ({
        group_id: newGroup.id,
        user_id: m.user_id,
        encrypted_group_key: m.encrypted_group_key,
        role: m.user_id === user.id ? "ADMIN" : "MEMBER"
      }));

      await tx.groupMember.createMany({
        data: memberData
      });

      return await tx.group.findUnique({
        where: { id: newGroup.id },
        include: { members: true }
      });
    });

    return noStoreJson({ success: true, group });
  } catch (error) {
    console.error("Error creating group:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
