import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id } = await request.json();
    if (!session_id || typeof session_id !== "string") {
      return noStoreJson({ error: "Invalid session_id" }, { status: 400 });
    }

    // Ensure they can only delete their own sessions
    const session = await prisma.session.findUnique({
      where: { id: session_id }
    });

    if (!session || session.user_id !== user.id) {
      return noStoreJson({ error: "Session not found" }, { status: 404 });
    }

    await prisma.session.delete({
      where: { id: session_id }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
