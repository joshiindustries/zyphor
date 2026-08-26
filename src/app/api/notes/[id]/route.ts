import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: { shares: true }
    });

    if (!note) {
      return noStoreJson({ error: "Note not found" }, { status: 404 });
    }

    const isOwner = note.user_id === user.id;
    const isShared = note.shares.some(share => share.shared_with_user_id === user.id);

    if (!isOwner && !isShared) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    return noStoreJson({ success: true, note });
  } catch (error) {
    console.error("Error fetching note:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: { shares: true }
    });

    if (!note) {
      return noStoreJson({ error: "Note not found" }, { status: 404 });
    }

    const isOwner = note.user_id === user.id;
    const share = note.shares.find(s => s.shared_with_user_id === user.id);
    const hasWriteAccess = isOwner || (share && share.access_level === "WRITE");

    if (!hasWriteAccess) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: params.id },
      data: {
        encrypted_title: body.encrypted_title !== undefined ? body.encrypted_title : note.encrypted_title,
        encrypted_content: body.encrypted_content !== undefined ? body.encrypted_content : note.encrypted_content,
        is_pinned: body.is_pinned !== undefined ? body.is_pinned : note.is_pinned
      }
    });

    return noStoreJson({ success: true, note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }
    
    const note = await prisma.note.findUnique({
      where: { id: params.id }
    });

    if (!note || note.user_id !== user.id) {
      return noStoreJson({ error: "Note not found or forbidden" }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id: params.id }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
