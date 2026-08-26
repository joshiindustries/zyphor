import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") || null;

    const folders = await prisma.vaultFolder.findMany({
      where: { 
        user_id: user.id,
        parent_id: parentId
      },
      orderBy: { created_at: "desc" }
    });

    return noStoreJson({ success: true, folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted_name, parent_id } = await request.json();

    if (!encrypted_name || typeof encrypted_name !== "string") {
      return noStoreJson({ error: "Invalid encrypted name" }, { status: 400 });
    }

    if (parent_id) {
      // Verify parent belongs to user
      const parentFolder = await prisma.vaultFolder.findUnique({
        where: { id: parent_id }
      });
      
      if (!parentFolder || parentFolder.user_id !== user.id) {
        return noStoreJson({ error: "Invalid parent folder" }, { status: 400 });
      }
    }

    const folder = await prisma.vaultFolder.create({
      data: {
        user_id: user.id,
        parent_id: parent_id || null,
        encrypted_name
      }
    });

    return noStoreJson({ success: true, folder });
  } catch (error) {
    console.error("Error creating folder:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
