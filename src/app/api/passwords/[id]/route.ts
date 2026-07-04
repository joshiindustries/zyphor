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
    const { encrypted_data } = await request.json();

    if (!encrypted_data || typeof encrypted_data !== "string") {
      return noStoreJson({ error: "Invalid encrypted_data" }, { status: 400 });
    }

    const existing = await prisma.passwordEntry.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    const password = await prisma.passwordEntry.update({
      where: { id },
      data: { encrypted_data }
    });

    return noStoreJson({ success: true, password });
  } catch (error) {
    console.error("Error updating password:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const existing = await prisma.passwordEntry.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    await prisma.passwordEntry.delete({ where: { id } });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting password:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
