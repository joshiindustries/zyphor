import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { column_id, encrypted_title, encrypted_description } = await request.json();
    if (!column_id || !encrypted_title) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify column belongs to user
    const column = await prisma.taskColumn.findUnique({
      where: { id: column_id },
      include: { board: true }
    });

    if (!column || column.board.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    // Get max order
    const lastTask = await prisma.task.findFirst({
      where: { column_id },
      orderBy: { order: 'desc' }
    });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        column_id,
        encrypted_title,
        encrypted_description,
        order
      }
    });

    return noStoreJson({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { task_id, column_id, order, encrypted_title, encrypted_description } = await request.json();
    if (!task_id) {
      return noStoreJson({ error: "Missing task_id" }, { status: 400 });
    }

    // Verify task belongs to user
    const existing = await prisma.task.findUnique({
      where: { id: task_id },
      include: { column: { include: { board: true } } }
    });

    if (!existing || existing.column.board.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    if (column_id !== undefined) {
      const targetColumn = await prisma.taskColumn.findUnique({
        where: { id: column_id },
        include: { board: true }
      });

      if (!targetColumn || targetColumn.board.user_id !== user.id || targetColumn.board_id !== existing.column.board_id) {
        return noStoreJson({ error: "Target column not found" }, { status: 404 });
      }
    }

    const updateData: any = {};
    if (column_id !== undefined) updateData.column_id = column_id;
    if (order !== undefined) updateData.order = order;
    if (encrypted_title !== undefined) updateData.encrypted_title = encrypted_title;
    if (encrypted_description !== undefined) updateData.encrypted_description = encrypted_description;

    // Wait, if we are doing drag and drop reordering, we need a robust solution, 
    // but for this phase we can just accept the new order and column_id
    // and rely on the client sending bulk updates or just ignoring precise mid-column ordering 
    // (a simple approach is to let order = new index, but others might conflict. 
    // We will just update this one task's order for now, which is enough for basic visual state if we fetch again later).

    const task = await prisma.task.update({
      where: { id: task_id },
      data: updateData
    });

    return noStoreJson({ success: true, task });
  } catch (error) {
    console.error("Error updating task:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get("taskId");
    
    if (!task_id) {
      return noStoreJson({ error: "Missing taskId" }, { status: 400 });
    }

    // Verify task belongs to user
    const existing = await prisma.task.findUnique({
      where: { id: task_id },
      include: { column: { include: { board: true } } }
    });

    if (!existing || existing.column.board.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: task_id }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
