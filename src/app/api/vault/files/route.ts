import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || null;
    const trashed = searchParams.get("trashed") === "true";
    const favorites = searchParams.get("favorites") === "true";

    const whereClause: any = { user_id: user.id };
    
    if (trashed) {
      whereClause.is_trashed = true;
    } else {
      whereClause.is_trashed = false;
      if (favorites) {
        whereClause.is_favorite = true;
      } else {
        whereClause.folder_id = folderId;
      }
    }

    const files = await prisma.vaultFile.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" }
    });

    return noStoreJson({ success: true, files });
  } catch (error) {
    console.error("Error fetching files:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { folder_id, encrypted_metadata, storage_path } = await request.json();

    if (!encrypted_metadata || !storage_path) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    if (folder_id) {
      // Verify folder belongs to user
      const folder = await prisma.vaultFolder.findUnique({
        where: { id: folder_id }
      });
      
      if (!folder || folder.user_id !== user.id) {
        return noStoreJson({ error: "Invalid folder" }, { status: 400 });
      }
    }

    const file = await prisma.vaultFile.create({
      data: {
        user_id: user.id,
        folder_id: folder_id || null,
        encrypted_metadata,
        storage_path
      }
    });

    return noStoreJson({ success: true, file });
  } catch (error) {
    console.error("Error creating file record:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, is_trashed, is_favorite } = await request.json();

    if (!id) {
      return noStoreJson({ error: "File ID required" }, { status: 400 });
    }

    const file = await prisma.vaultFile.findUnique({
      where: { id }
    });
    
    if (!file || file.user_id !== user.id) {
      return noStoreJson({ error: "File not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof is_trashed === "boolean") updateData.is_trashed = is_trashed;
    if (typeof is_favorite === "boolean") updateData.is_favorite = is_favorite;

    const updatedFile = await prisma.vaultFile.update({
      where: { id },
      data: updateData
    });

    return noStoreJson({ success: true, file: updatedFile });
  } catch (error) {
    console.error("Error updating file record:", error);
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
    const fileId = searchParams.get("id");

    if (!fileId) {
      return noStoreJson({ error: "File ID required" }, { status: 400 });
    }

    const file = await prisma.vaultFile.findUnique({
      where: { id: fileId }
    });

    if (!file || file.user_id !== user.id) {
      return noStoreJson({ error: "File not found or forbidden" }, { status: 404 });
    }

    await prisma.vaultFile.delete({
      where: { id: fileId }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
