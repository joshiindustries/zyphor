import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const userId = user.id;

    // Fetch all user data
    const notes = await prisma.note.findMany({ where: { user_id: userId } });
    
    const boards = await prisma.taskBoard.findMany({ 
      where: { user_id: userId },
      include: { columns: { include: { tasks: true } } }
    });

    const passwords = await prisma.passwordEntry.findMany({ where: { user_id: userId } });
    
    const calendars = await prisma.eventCalendar.findMany({ 
      where: { user_id: userId },
      include: { events: true }
    });

    const vaultFiles = await prisma.vaultFile.findMany({ where: { user_id: userId } });
    const userRecord = await prisma.user.findUnique({ where: { id: userId } });

    // Aggregate into a backup payload
    const backupData = {
      metadata: {
        version: "1.0.0",
        export_date: new Date().toISOString(),
        user: {
          email: userRecord?.email,
          username: userRecord?.username
        }
      },
      data: {
        notes,
        boards,
        passwords,
        calendars,
        vaultFiles
      }
    };

    // Return as a downloadable JSON file
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="zyphor-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
