import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { noStoreJson } from "@/lib/security";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return noStoreJson({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Use OS temp dir for standard Next.js deployments
    const tmpDir = os.tmpdir();
    const uniqueFileName = `${crypto.randomUUID()}-${file.name}`;
    const storagePath = path.join(tmpDir, uniqueFileName);

    fs.writeFileSync(storagePath, buffer);

    return noStoreJson({ success: true, storage_path: storagePath });
  } catch (error) {
    console.error("Error uploading file:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
