import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await prisma.taskBoard.findUnique({
      where: { id: params.id },
      include: {
        columns: {
          include: {
            tasks: {
              orderBy: { order: "asc" }
            }
          },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!board || board.user_id !== user.id) {
      return noStoreJson({ error: "Board not found" }, { status: 404 });
    }

    return noStoreJson({ success: true, board });
  } catch (error) {
    console.error("Error fetching board:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
