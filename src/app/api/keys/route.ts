import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const publicKey = cleanText(body.public_key, 20000);
    const deviceId = cleanText(body.device_id, 160);
    const encryptedPrivateKey = cleanText(body.encrypted_private_key, 60000);
    const privateKeySalt = cleanText(body.private_key_salt, 2000);
    const privateKeyHint = cleanText(body.private_key_hint, 160);

    if (!publicKey) {
      return noStoreJson({ error: "Invalid public key" }, { status: 400 });
    }

    const data = {
      public_key: publicKey,
      device_id: deviceId,
      encrypted_private_key: encryptedPrivateKey,
      private_key_salt: privateKeySalt,
      private_key_hint: privateKeyHint || "Encrypted with your master vault password",
    };

    const existingKey = deviceId
      ? await prisma.userKey.findFirst({ where: { user_id: user.id, device_id: deviceId } })
      : await prisma.userKey.findFirst({ where: { user_id: user.id } });

    if (existingKey) {
      await prisma.userKey.update({
        where: { id: existingKey.id },
        data,
      });
    } else {
      await prisma.userKey.create({
        data: {
          user_id: user.id,
          ...data,
        },
      });
    }

    return noStoreJson({ success: true, message: "Device key saved securely." });
  } catch (error) {
    console.error("Error saving public key:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const targetUsername = searchParams.get("username");

    if (!targetUserId && !targetUsername) {
      const keys = await prisma.userKey.findMany({
        where: { user_id: user.id },
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          device_id: true,
          public_key: true,
          encrypted_private_key: true,
          private_key_salt: true,
          private_key_hint: true,
          created_at: true,
          updated_at: true,
        },
      });

      return noStoreJson({ success: true, keys });
    }

    const targetUser = targetUserId
      ? await prisma.user.findUnique({ where: { id: targetUserId }, include: { keys: true } })
      : await prisma.user.findUnique({ where: { username: targetUsername!.toLowerCase() }, include: { keys: true } });

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
      public_key: userKey,
    });
  } catch (error) {
    console.error("Error fetching public key:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
