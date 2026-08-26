import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const board = await prisma.taskBoard.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!board || board.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    return noStoreJson({ success: true, board });
  } catch (error) {
    console.error("Error fetching board:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const board = await prisma.taskBoard.findUnique({
      where: { id }
    });

    if (!board || board.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    await prisma.taskBoard.delete({
      where: { id }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
