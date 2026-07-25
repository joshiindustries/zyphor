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

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const passkeys = await prisma.passkeyCredential.findMany({
      where: { user_id: user.id },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        credential_id: true,
        name: true,
        transports: true,
        created_at: true,
        updated_at: true,
        last_used_at: true,
      },
    });

    return noStoreJson({ success: true, passkeys });
  } catch (error) {
    console.error("Error loading passkeys:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const credentialId = cleanText(body.credential_id, 4000);
    const publicKey = cleanText(body.public_key, 60000);
    const transports = cleanText(body.transports, 2000);
    const name = cleanText(body.name, 120) || "Device passkey";
    const encryptedSecret = cleanText(body.encrypted_secret, 60000);
    const secretSalt = cleanText(body.secret_salt, 2000);

    if (!credentialId || !publicKey) {
      return noStoreJson({ error: "Missing passkey credential payload." }, { status: 400 });
    }

    const existing = await prisma.passkeyCredential.findUnique({
      where: { credential_id: credentialId },
      select: { id: true, user_id: true },
    });

    if (existing && existing.user_id !== user.id) {
      return noStoreJson({ error: "Passkey credential is already registered." }, { status: 409 });
    }

    const data = {
      public_key: publicKey,
      transports,
      name,
      encrypted_secret: encryptedSecret,
      secret_salt: secretSalt,
    };

    const passkey = existing
      ? await prisma.passkeyCredential.update({ where: { id: existing.id }, data })
      : await prisma.passkeyCredential.create({
        data: {
          user_id: user.id,
          credential_id: credentialId,
          ...data,
        },
      });

    return noStoreJson({ success: true, passkey: { id: passkey.id, name: passkey.name } });
  } catch (error) {
    console.error("Error saving passkey:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = cleanText(searchParams.get("id"), 120);
    if (!id) return noStoreJson({ error: "Passkey id is required." }, { status: 400 });

    await prisma.passkeyCredential.deleteMany({ where: { id, user_id: user.id } });
    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}