import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") !== "false";
    const limitParam = Number(searchParams.get("limit") || 30);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;

    const notifications = await prisma.notification.findMany({
      where: {
        user_id: user.id,
        ...(unreadOnly ? { is_read: false } : {}),
      },
      orderBy: { created_at: "desc" },
      take,
    });

    return noStoreJson({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { ids, all, is_read } = await request.json();
    const readValue = typeof is_read === "boolean" ? is_read : true;

    if (all === true) {
      await prisma.notification.updateMany({
        where: { user_id: user.id, is_read: !readValue },
        data: { is_read: readValue },
      });
      return noStoreJson({ success: true });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return noStoreJson({ error: "Notification ids are required." }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        user_id: user.id,
        id: { in: ids.filter((id: unknown): id is string => typeof id === "string") },
      },
      data: { is_read: readValue },
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}