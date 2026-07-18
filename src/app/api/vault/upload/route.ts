import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { noStoreJson } from "@/lib/security";
import { uploadVaultObject } from "@/lib/cloud-storage";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const connectionIdValue = formData.get("connectionId");
    const connectionId = typeof connectionIdValue === "string" && connectionIdValue ? connectionIdValue : null;

    if (!file) {
      return noStoreJson({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = await uploadVaultObject({
      userId: user.id,
      fileName: file.name,
      bytes: buffer,
      contentType: file.type || "application/octet-stream",
      connectionId,
    });

    return noStoreJson({ success: true, storage_path: storagePath });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return noStoreJson({ error: error.message || "Internal server error" }, { status: 500 });
  }
}