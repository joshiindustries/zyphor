import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs";

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

    if (!fs.existsSync(file.storage_path)) {
      return new NextResponse("Physical file not found on server", { status: 404 });
    }

    const fileStream = fs.createReadStream(file.storage_path);
    
    return new NextResponse(fileStream as any, {
      headers: {
        "Content-Type": "application/octet-stream",
      }
    });

  } catch (error) {
    console.error("Error downloading file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
