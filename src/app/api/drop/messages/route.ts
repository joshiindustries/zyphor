import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.dropMessage.findMany({
      where: { recipient_id: user.id },
      orderBy: { created_at: "desc" }
    });

    return noStoreJson({ success: true, messages });
  } catch (error) {
    console.error("Failed to fetch drop messages:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, encrypted_content } = await request.json();

    if (!username || !encrypted_content) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({
      where: { username }
    });

    if (!recipient) {
      return noStoreJson({ error: "Recipient not found" }, { status: 404 });
    }

    const drop = await prisma.dropMessage.create({
      data: {
        recipient_id: recipient.id,
        encrypted_content
      }
    });

    return noStoreJson({ success: true, id: drop.id });
  } catch (error) {
    console.error("Failed to send drop message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return noStoreJson({ error: "Missing ID" }, { status: 400 });

    const drop = await prisma.dropMessage.findUnique({ where: { id } });
    if (!drop || drop.recipient_id !== user.id) {
      return noStoreJson({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.dropMessage.delete({ where: { id } });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Failed to delete drop message:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
