import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const { is_favorite } = await request.json();

    const existing = await prisma.vaultFile.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.vaultFile.update({
      where: { id },
      data: { is_favorite: Boolean(is_favorite) }
    });

    return noStoreJson({ success: true, file: updated });
  } catch (error) {
    console.error("Error updating favorite status:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
