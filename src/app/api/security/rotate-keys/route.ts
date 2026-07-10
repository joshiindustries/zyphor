import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    // Fetch all encrypted data for the user
    const [
      folders,
      files,
      tags,
      notes,
      boards,
      columns,
      tasks,
      events,
      passwords
    ] = await Promise.all([
      prisma.vaultFolder.findMany({ where: { user_id: user.id } }),
      prisma.vaultFile.findMany({ where: { user_id: user.id } }),
      prisma.vaultTag.findMany({ where: { user_id: user.id } }),
      prisma.note.findMany({ where: { user_id: user.id } }),
      prisma.taskBoard.findMany({ where: { user_id: user.id } }),
      prisma.taskColumn.findMany({ where: { board: { user_id: user.id } } }),
      prisma.task.findMany({ where: { column: { board: { user_id: user.id } } } }),
      prisma.event.findMany({ where: { calendar: { user_id: user.id } } }),
      prisma.passwordEntry.findMany({ where: { user_id: user.id } })
    ]);

    return noStoreJson({
      success: true,
      data: {
        folders,
        files,
        tags,
        notes,
        boards,
        columns,
        tasks,
        events,
        passwords
      }
    });
  } catch (error) {
    console.error("Failed to fetch data for key rotation:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const payload = await request.json();
    
    // We expect arrays of objects with { id, encrypted_data }
    const {
      folders,
      files,
      tags,
      notes,
      boards,
      columns,
      tasks,
      events,
      passwords
    } = payload;

    // Use Prisma Transactions for atomicity
    await prisma.$transaction(async (tx) => {

      // Vault Folders
      for (const f of folders || []) {
        if (f.encrypted_name) {
          await tx.vaultFolder.update({ where: { id: f.id }, data: { encrypted_name: f.encrypted_name } });
        }
      }

      // Vault Files
      for (const f of files || []) {
        if (f.encrypted_metadata) {
          await tx.vaultFile.update({ where: { id: f.id }, data: { encrypted_metadata: f.encrypted_metadata } });
        }
      }

      // Vault Tags
      for (const t of tags || []) {
        if (t.encrypted_name) {
          await tx.vaultTag.update({ where: { id: t.id }, data: { encrypted_name: t.encrypted_name } });
        }
      }

      // Secure Notes
      for (const n of notes || []) {
        if (n.encrypted_content) {
          await tx.note.update({ where: { id: n.id }, data: { encrypted_content: n.encrypted_content } });
        }
      }

      // Kanban Boards
      for (const b of boards || []) {
        if (b.encrypted_title) {
          await tx.taskBoard.update({ where: { id: b.id }, data: { encrypted_title: b.encrypted_title } });
        }
      }

      // Kanban Columns
      for (const c of columns || []) {
        if (c.name) {
          await tx.taskColumn.update({ where: { id: c.id }, data: { name: c.name } });
        }
      }

      // Kanban Tasks
      for (const t of tasks || []) {
        if (t.encrypted_title) {
          await tx.task.update({ where: { id: t.id }, data: { encrypted_title: t.encrypted_title, encrypted_description: t.encrypted_description } });
        }
      }

      // Calendar Events
      for (const e of events || []) {
        if (e.encrypted_title) {
          await tx.event.update({ where: { id: e.id }, data: { encrypted_title: e.encrypted_title, encrypted_description: e.encrypted_description } });
        }
      }

      // Password Entries
      for (const p of passwords || []) {
        if (p.encrypted_data) {
          await tx.passwordEntry.update({ where: { id: p.id }, data: { encrypted_data: p.encrypted_data } });
        }
      }
    }, {
      maxWait: 15000, // 15 seconds max wait to start transaction
      timeout: 60000 // 60 seconds timeout for massive rotations
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Failed to rotate keys:", error);
    return noStoreJson({ error: "Key rotation transaction failed." }, { status: 500 });
  }
}
