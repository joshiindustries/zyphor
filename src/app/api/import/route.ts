import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { notes, tasks, passwords } = payload;
    let imported = { notes: 0, tasks: 0, passwords: 0 };

    // Notes
    if (notes && Array.isArray(notes)) {
      const formattedNotes = notes.map(n => ({
        user_id: user.id,
        encrypted_title: n.encrypted_title,
        encrypted_content: n.encrypted_content,
        is_pinned: n.is_pinned || false
      }));
      if (formattedNotes.length > 0) {
        await prisma.note.createMany({ data: formattedNotes });
        imported.notes = formattedNotes.length;
      }
    }

    // Tasks
    if (tasks && Array.isArray(tasks)) {
      // Create a default board for imported tasks
      let board = await prisma.board.findFirst({ where: { user_id: user.id, title: "Imported Board" } });
      if (!board) {
        board = await prisma.board.create({
          data: {
            user_id: user.id,
            title: "Imported Board",
            columns: JSON.stringify([{ id: "col-imported", title: "Imported Tasks", taskIds: [] }])
          }
        });
      }

      const formattedTasks = tasks.map(t => ({
        user_id: user.id,
        board_id: board!.id,
        encrypted_title: t.encrypted_title,
        encrypted_description: t.encrypted_description,
        encrypted_column_id: t.encrypted_column_id || "col-imported" // Default fallback
      }));
      
      if (formattedTasks.length > 0) {
        await prisma.task.createMany({ data: formattedTasks });
        imported.tasks = formattedTasks.length;
      }
    }

    // Passwords
    if (passwords && Array.isArray(passwords)) {
      const formattedPasswords = passwords.map(p => ({
        user_id: user.id,
        encrypted_data: p.encrypted_data
      }));
      if (formattedPasswords.length > 0) {
        await prisma.password.createMany({ data: formattedPasswords });
        imported.passwords = formattedPasswords.length;
      }
    }

    return noStoreJson({ success: true, imported });
  } catch (error) {
    console.error("Import error:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
