import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const boards = await prisma.taskBoard.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { columns: true }
        }
      }
    });

    return noStoreJson({ success: true, boards });
  } catch (error) {
    console.error("Error fetching task boards:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted_title } = await request.json();
    if (!encrypted_title || typeof encrypted_title !== "string") {
      return noStoreJson({ error: "Invalid encrypted_title" }, { status: 400 });
    }

    const board = await prisma.taskBoard.create({
      data: {
        user_id: user.id,
        encrypted_title,
        columns: {
          create: [
            { name: "To Do", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "Done", order: 2 }
          ]
        }
      }
    });

    return noStoreJson({ success: true, board });
  } catch (error) {
    console.error("Error creating task board:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
