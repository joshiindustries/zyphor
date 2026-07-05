import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

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
      passwords,
      userData
    ] = await Promise.all([
      prisma.vaultFolder.findMany({ where: { user_id: user.id } }),
      prisma.vaultFile.findMany({ where: { user_id: user.id } }),
      prisma.vaultTag.findMany({ where: { user_id: user.id } }),
      prisma.secureNote.findMany({ where: { user_id: user.id } }),
      prisma.kanbanBoard.findMany({ where: { user_id: user.id } }),
      prisma.kanbanColumn.findMany({ where: { board: { user_id: user.id } } }),
      prisma.kanbanTask.findMany({ where: { column: { board: { user_id: user.id } } } }),
      prisma.calendarEvent.findMany({ where: { user_id: user.id } }),
      prisma.passwordEntry.findMany({ where: { user_id: user.id } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { encrypted_priv_key: true } })
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
        passwords,
        encrypted_priv_key: userData?.encrypted_priv_key
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
      passwords,
      encrypted_priv_key
    } = payload;

    // Use Prisma Transactions for atomicity
    await prisma.$transaction(async (tx) => {
      // Update User Key
      if (encrypted_priv_key) {
        await tx.user.update({
          where: { id: user.id },
          data: { encrypted_priv_key }
        });
      }

      // Vault Folders
      for (const f of folders || []) {
        await tx.vaultFolder.update({ where: { id: f.id }, data: { encrypted_metadata: f.encrypted_metadata } });
      }

      // Vault Files
      for (const f of files || []) {
        await tx.vaultFile.update({ where: { id: f.id }, data: { encrypted_metadata: f.encrypted_metadata } });
      }

      // Vault Tags
      for (const t of tags || []) {
        await tx.vaultTag.update({ where: { id: t.id }, data: { encrypted_name: t.encrypted_name, encrypted_color: t.encrypted_color } });
      }

      // Secure Notes
      for (const n of notes || []) {
        await tx.secureNote.update({ where: { id: n.id }, data: { encrypted_content: n.encrypted_content } });
      }

      // Kanban Boards
      for (const b of boards || []) {
        await tx.kanbanBoard.update({ where: { id: b.id }, data: { encrypted_metadata: b.encrypted_metadata } });
      }

      // Kanban Columns
      for (const c of columns || []) {
        await tx.kanbanColumn.update({ where: { id: c.id }, data: { encrypted_name: c.encrypted_name } });
      }

      // Kanban Tasks
      for (const t of tasks || []) {
        await tx.kanbanTask.update({ where: { id: t.id }, data: { encrypted_title: t.encrypted_title, encrypted_description: t.encrypted_description } });
      }

      // Calendar Events
      for (const e of events || []) {
        await tx.calendarEvent.update({ where: { id: e.id }, data: { encrypted_title: e.encrypted_title, encrypted_description: e.encrypted_description } });
      }

      // Password Entries
      for (const p of passwords || []) {
        await tx.passwordEntry.update({ where: { id: p.id }, data: { encrypted_username: p.encrypted_username, encrypted_password: p.encrypted_password, encrypted_notes: p.encrypted_notes, encrypted_url: p.encrypted_url } });
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
