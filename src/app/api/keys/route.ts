import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { public_key } = await request.json();
    if (!public_key || typeof public_key !== "string") {
      return noStoreJson({ error: "Invalid public key" }, { status: 400 });
    }

    // Upsert the public key for the user (assuming 1 identity key per user for now)
    const existingKey = await prisma.userKey.findFirst({
      where: { user_id: user.id }
    });

    if (existingKey) {
      await prisma.userKey.update({
        where: { id: existingKey.id },
        data: { public_key }
      });
    } else {
      await prisma.userKey.create({
        data: {
          user_id: user.id,
          public_key
        }
      });
    }

    return noStoreJson({ success: true, message: "Public key saved successfully" });
  } catch (error) {
    console.error("Error saving public key:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const targetUsername = searchParams.get("username");

    if (!targetUserId && !targetUsername) {
      return noStoreJson({ error: "Must provide userId or username" }, { status: 400 });
    }

    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, include: { keys: true } });
    } else if (targetUsername) {
      targetUser = await prisma.user.findUnique({ where: { username: targetUsername.toLowerCase() }, include: { keys: true } });
    }

    if (!targetUser) {
      return noStoreJson({ error: "User not found" }, { status: 404 });
    }

    const userKey = targetUser.keys && targetUser.keys.length > 0 ? targetUser.keys[0].public_key : null;
    
    if (!userKey) {
      return noStoreJson({ error: "User has no public key registered" }, { status: 404 });
    }

    return noStoreJson({ 
      success: true, 
      user: { id: targetUser.id, name: targetUser.name, username: targetUser.username },
      public_key: userKey 
    });
  } catch (error) {
    console.error("Error fetching public key:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
