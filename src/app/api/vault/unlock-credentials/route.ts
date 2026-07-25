import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["PIN", "PASSKEY"]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = cleanText(searchParams.get("type"), 20)?.toUpperCase();

    const credentials = await prisma.unlockCredential.findMany({
      where: {
        user_id: user.id,
        ...(type && ALLOWED_TYPES.has(type) ? { type } : {}),
      },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        type: true,
        label: true,
        salt: true,
        verifier: true,
        encrypted_secret: true,
        created_at: true,
        updated_at: true,
        last_used_at: true,
      },
    });

    return noStoreJson({ success: true, credentials });
  } catch (error) {
    console.error("Error loading unlock credentials:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const type = cleanText(body.type, 20)?.toUpperCase() || "PIN";
    const label = cleanText(body.label, 120);
    const salt = cleanText(body.salt, 2000);
    const verifier = cleanText(body.verifier, 20000);
    const encryptedSecret = cleanText(body.encrypted_secret, 60000);

    if (!ALLOWED_TYPES.has(type)) {
      return noStoreJson({ error: "Unsupported unlock credential type." }, { status: 400 });
    }

    if (!salt || !encryptedSecret) {
      return noStoreJson({ error: "Missing encrypted unlock credential payload." }, { status: 400 });
    }

    const credential = await prisma.unlockCredential.create({
      data: {
        user_id: user.id,
        type,
        label,
        salt,
        verifier,
        encrypted_secret: encryptedSecret,
      },
    });

    return noStoreJson({ success: true, credential: { id: credential.id, type: credential.type, label: credential.label } });
  } catch (error) {
    console.error("Error saving unlock credential:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = cleanText(searchParams.get("id"), 120);
    if (!id) return noStoreJson({ error: "Credential id is required." }, { status: 400 });

    await prisma.unlockCredential.deleteMany({ where: { id, user_id: user.id } });
    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting unlock credential:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
