import crypto from "crypto";
import fs from "fs";
import {
  deleteSupabaseObject,
  downloadSupabaseObject,
  uploadSupabaseObject,
} from "@/lib/supabase-storage";

type StorageLocation = {
  v: 1;
  provider: string;
  connectionId?: string;
  path: string;
};

type VaultObject = {
  body: BodyInit;
  contentType: string;
  contentLength?: string;
};

function safeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/\.enc$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return cleaned || "vault-file";
}

function serializeLocation(location: StorageLocation): string {
  return JSON.stringify(location);
}

function parseLocation(storagePath: string): StorageLocation {
  try {
    const parsed = JSON.parse(storagePath) as Partial<StorageLocation>;
    if (parsed.v === 1 && parsed.provider && parsed.path) {
      return parsed as StorageLocation;
    }
  } catch {
    // Legacy records may contain a raw path instead of a structured payload.
  }

  if (storagePath.startsWith("vault/") || storagePath.startsWith("uploads/")) {
    return { v: 1, provider: "SUPABASE", path: storagePath };
  }

  return { v: 1, provider: "LOCAL", path: storagePath };
}

export function isPersistableVaultStoragePath(userId: string, storagePath: unknown): storagePath is string {
  if (typeof storagePath !== "string" || !storagePath.trim()) return false;

  const location = parseLocation(storagePath);
  return location.provider === "SUPABASE" && location.path.startsWith(`vault/${userId}/`);
}

export async function uploadVaultObject(args: {
  userId: string;
  fileName: string;
  bytes: Uint8Array;
  contentType?: string;
  connectionId?: string | null;
}): Promise<string> {
  const objectName = `${crypto.randomUUID()}-${safeFileName(args.fileName)}`;
  const contentType = args.contentType || "application/octet-stream";
  const supabasePath = `vault/${args.userId}/${objectName}`;

  await uploadSupabaseObject(supabasePath, args.bytes, contentType);
  return serializeLocation({ v: 1, provider: "SUPABASE", path: supabasePath });
}

export async function downloadVaultObject(_userId: string, storagePath: string): Promise<VaultObject> {
  const location = parseLocation(storagePath);

  if (location.provider === "SUPABASE") {
    const response = await downloadSupabaseObject(location.path);
    if (!response.body) throw new Error("Downloaded storage object has no response body.");
    return {
      body: response.body,
      contentType: response.headers.get("content-type") || "application/octet-stream",
      contentLength: response.headers.get("content-length") || undefined,
    };
  }

  if (location.provider === "LOCAL") {
    if (!fs.existsSync(location.path)) {
      throw new Error("Physical file not found on server.");
    }
    const bytes = fs.readFileSync(location.path);
    return {
      body: bytes as unknown as BodyInit,
      contentType: "application/octet-stream",
      contentLength: bytes.length.toString(),
    };
  }

  throw new Error("External cloud storage providers have been removed for this app.");
}

export async function deleteVaultObject(_userId: string, storagePath: string): Promise<void> {
  const location = parseLocation(storagePath);

  if (location.provider === "SUPABASE") {
    await deleteSupabaseObject(location.path);
    return;
  }

  if (location.provider === "LOCAL") {
    if (fs.existsSync(location.path)) fs.unlinkSync(location.path);
    return;
  }

  throw new Error("External cloud storage providers have been removed for this app.");
}