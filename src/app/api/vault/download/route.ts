import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadVaultObject } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return new NextResponse("fileId required", { status: 400 });
    }

    const file = await prisma.vaultFile.findUnique({
      where: { id: fileId }
    });

    if (!file || file.user_id !== user.id) {
      return new NextResponse("File not found or forbidden", { status: 404 });
    }

    const object = await downloadVaultObject(user.id, file.storage_path);

    return new NextResponse(object.body, {
      headers: {
        "Content-Type": object.contentType,
        ...(object.contentLength ? { "Content-Length": object.contentLength } : {}),
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      }
    });

  } catch (error: any) {
    console.error("Error downloading file:", error);
    return new NextResponse(error.message || "Internal server error", { status: 500 });
  }
}