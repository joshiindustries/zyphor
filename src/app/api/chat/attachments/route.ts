import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique filename
    const uniqueId = crypto.randomUUID();
    const originalName = file.name || "attachment";
    
    // We only need a secure random name for the storage path to avoid collisions
    const fileName = `${uniqueId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "chat");
    
    // Ensure directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);

    // Return the URL path
    const fileUrl = `/uploads/chat/${fileName}`;

    return NextResponse.json({
      url: fileUrl,
      size: file.size,
      type: file.type || "application/octet-stream",
    });

  } catch (error: any) {
    console.error("Error uploading chat attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
