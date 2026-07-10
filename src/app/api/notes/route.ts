import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { user_id: user.id },
      orderBy: [
        { is_pinned: "desc" },
        { updated_at: "desc" }
      ]
    });

    const sharedNotes = await prisma.noteShare.findMany({
      where: { shared_with_user_id: user.id },
      include: { note: true }
    });

    return noStoreJson({ 
      success: true, 
      notes,
      sharedNotes: sharedNotes.map(share => ({ ...share.note, access_level: share.access_level, encrypted_note_key: share.encrypted_note_key })) 
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted_title, encrypted_content, is_pinned } = await request.json();

    if (!encrypted_title || !encrypted_content) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        user_id: user.id,
        encrypted_title,
        encrypted_content,
        is_pinned: is_pinned || false
      }
    });

    return noStoreJson({ success: true, note });
  } catch (error) {
    console.error("Error creating note:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
