import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { column_id, encrypted_title, encrypted_description, due_date } = await request.json();

    if (!column_id || !encrypted_title) {
      return noStoreJson({ error: "column_id and encrypted_title required" }, { status: 400 });
    }

    // Verify user owns the board that this column belongs to
    const column = await prisma.taskColumn.findUnique({
      where: { id: column_id },
      include: { board: true }
    });

    if (!column || column.board.user_id !== user.id) {
      return noStoreJson({ error: "Column not found or forbidden" }, { status: 404 });
    }

    // Get the current max order in this column to append to the end
    const lastTask = await prisma.task.findFirst({
      where: { column_id },
      orderBy: { order: "desc" }
    });

    const newOrder = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        column_id,
        encrypted_title,
        encrypted_description,
        order: newOrder,
        due_date: due_date ? new Date(due_date) : null
      }
    });

    return noStoreJson({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { task_id, column_id, encrypted_title, encrypted_description, order, due_date } = await request.json();

    if (!task_id) {
      return noStoreJson({ error: "task_id required" }, { status: 400 });
    }

    // Verify user owns the task
    const task = await prisma.task.findUnique({
      where: { id: task_id },
      include: { column: { include: { board: true } } }
    });

    if (!task || task.column.board.user_id !== user.id) {
      return noStoreJson({ error: "Task not found or forbidden" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task_id },
      data: {
        column_id: column_id !== undefined ? column_id : task.column_id,
        encrypted_title: encrypted_title !== undefined ? encrypted_title : task.encrypted_title,
        encrypted_description: encrypted_description !== undefined ? encrypted_description : task.encrypted_description,
        order: order !== undefined ? order : task.order,
        due_date: due_date !== undefined ? new Date(due_date) : task.due_date
      }
    });

    return noStoreJson({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
