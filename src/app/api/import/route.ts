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
      // Find any board
      let board = await prisma.taskBoard.findFirst({ where: { user_id: user.id } });
      if (!board) {
        board = await prisma.taskBoard.create({
          data: {
            user_id: user.id,
            encrypted_title: "Imported Board"
          }
        });
      }

      let column = await prisma.taskColumn.findFirst({ where: { board_id: board.id } });
      if (!column) {
        column = await prisma.taskColumn.create({
          data: {
            board_id: board.id,
            name: "Imported",
            order: 0
          }
        });
      }

      const formattedTasks = tasks.map((t, index) => ({
        column_id: column.id,
        encrypted_title: t.encrypted_title,
        encrypted_description: t.encrypted_description,
        order: index
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
        await prisma.passwordEntry.createMany({ data: formattedPasswords });
        imported.passwords = formattedPasswords.length;
      }
    }

    return noStoreJson({ success: true, imported });
  } catch (error) {
    console.error("Import error:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
