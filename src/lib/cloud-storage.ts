import crypto from "crypto";
import fs from "fs";
import { prisma } from "@/lib/db";
import {
  deleteSupabaseObject,
  downloadSupabaseObject,
  uploadSupabaseObject,
} from "@/lib/supabase-storage";
import {
  decryptCredentials,
  DropboxCredentials,
  WebDavCredentials,
} from "@/lib/cloud-credentials";

type StorageProvider = "SUPABASE" | "DROPBOX" | "WEBDAV" | "LOCAL";

type StorageLocation = {
  v: 1;
  provider: StorageProvider;
  connectionId?: string;
  path: string;
};

type VaultObject = {
  body: BodyInit;
  contentType: string;
  contentLength?: string;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

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
    // Legacy vault records stored a raw local filesystem path.
  }

  if (storagePath.startsWith("vault/") || storagePath.startsWith("uploads/")) {
    return { v: 1, provider: "SUPABASE", path: storagePath };
  }

  return { v: 1, provider: "LOCAL", path: storagePath };
}

export function isPersistableVaultStoragePath(userId: string, storagePath: unknown): storagePath is string {
  if (typeof storagePath !== "string" || !storagePath.trim()) return false;

  const location = parseLocation(storagePath);
  if (location.provider === "SUPABASE") {
    return location.path.startsWith(`vault/${userId}/`);
  }

  if (location.provider === "DROPBOX" || location.provider === "WEBDAV") {
    return Boolean(location.connectionId && location.path.startsWith("/"));
  }

  return false;
}

function joinCloudPath(prefix: string | undefined, fileName: string): string {
  const cleanPrefix = (prefix || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const segments = cleanPrefix ? cleanPrefix.split("/") : [];
  segments.push(fileName);
  return `/${segments.filter(Boolean).join("/")}`;
}

function encodeWebDavPath(pathValue: string): string {
  return pathValue
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function webDavUrl(credentials: WebDavCredentials, pathValue: string): string {
  return `${credentials.endpoint.replace(/\/+$/, "")}/${encodeWebDavPath(pathValue)}`;
}

function webDavAuthHeaders(credentials: WebDavCredentials, extra: Record<string, string> = {}): HeadersInit {
  return {
    Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
    ...extra,
  };
}

async function parseRemoteError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return response.statusText || "Unknown cloud storage error";
  try {
    const payload = JSON.parse(text);
    return payload?.error_summary || payload?.error?.message || payload?.message || text;
  } catch {
    return text;
  }
}

async function getCloudConnection(userId: string, connectionId: string) {
  const connection = await prisma.cloudConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.user_id !== userId) {
    throw new Error("Cloud connection not found.");
  }
  return connection;
}

async function getSelectedConnection(userId: string, connectionId?: string | null) {
  if (connectionId && connectionId !== "zyphor") {
    return getCloudConnection(userId, connectionId);
  }

  if (connectionId === "zyphor") return null;

  return prisma.cloudConnection.findFirst({
    where: { user_id: userId, is_default: true },
    orderBy: { updated_at: "desc" },
  });
}

async function ensureDropboxFolder(credentials: DropboxCredentials): Promise<void> {
  const prefix = credentials.pathPrefix?.replace(/^\/+|\/+$/g, "");
  if (!prefix) return;

  let current = "";
  for (const segment of prefix.split("/").filter(Boolean)) {
    current += `/${segment}`;
    const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: current, autorename: false }),
    });

    if (!response.ok && response.status !== 409) {
      throw new Error(`Dropbox folder setup failed: ${await parseRemoteError(response)}`);
    }
  }
}

async function uploadDropboxObject(credentials: DropboxCredentials, remotePath: string, bytes: Uint8Array): Promise<void> {
  await ensureDropboxFolder(credentials);

  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: remotePath,
        mode: "add",
        autorename: true,
        mute: true,
        strict_conflict: false,
      }),
    },
    body: toArrayBuffer(bytes),
  });

  if (!response.ok) {
    throw new Error(`Dropbox upload failed: ${await parseRemoteError(response)}`);
  }
}

async function downloadDropboxObject(credentials: DropboxCredentials, remotePath: string): Promise<VaultObject> {
  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: remotePath }),
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Dropbox download failed: ${await parseRemoteError(response)}`);
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
    contentLength: response.headers.get("content-length") || undefined,
  };
}

async function deleteDropboxObject(credentials: DropboxCredentials, remotePath: string): Promise<void> {
  const response = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: remotePath }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Dropbox delete failed: ${await parseRemoteError(response)}`);
  }
}

async function ensureWebDavFolders(credentials: WebDavCredentials): Promise<void> {
  const prefix = credentials.pathPrefix?.replace(/^\/+|\/+$/g, "");
  if (!prefix) return;

  let current = "";
  for (const segment of prefix.split("/").filter(Boolean)) {
    current += `/${segment}`;
    const response = await fetch(webDavUrl(credentials, current), {
      method: "MKCOL",
      headers: webDavAuthHeaders(credentials),
    });

    if (![200, 201, 204, 405].includes(response.status)) {
      throw new Error(`WebDAV folder setup failed: ${await parseRemoteError(response)}`);
    }
  }
}

async function uploadWebDavObject(credentials: WebDavCredentials, remotePath: string, bytes: Uint8Array, contentType: string): Promise<void> {
  await ensureWebDavFolders(credentials);

  const response = await fetch(webDavUrl(credentials, remotePath), {
    method: "PUT",
    headers: webDavAuthHeaders(credentials, { "Content-Type": contentType }),
    body: toArrayBuffer(bytes),
  });

  if (!response.ok) {
    throw new Error(`WebDAV upload failed: ${await parseRemoteError(response)}`);
  }
}

async function downloadWebDavObject(credentials: WebDavCredentials, remotePath: string): Promise<VaultObject> {
  const response = await fetch(webDavUrl(credentials, remotePath), {
    method: "GET",
    headers: webDavAuthHeaders(credentials),
  });

  if (!response.ok || !response.body) {
    throw new Error(`WebDAV download failed: ${await parseRemoteError(response)}`);
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
    contentLength: response.headers.get("content-length") || undefined,
  };
}

async function deleteWebDavObject(credentials: WebDavCredentials, remotePath: string): Promise<void> {
  const response = await fetch(webDavUrl(credentials, remotePath), {
    method: "DELETE",
    headers: webDavAuthHeaders(credentials),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV delete failed: ${await parseRemoteError(response)}`);
  }
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
  const connection = await getSelectedConnection(args.userId, args.connectionId);

  if (!connection) {
    const supabasePath = `vault/${args.userId}/${objectName}`;
    await uploadSupabaseObject(supabasePath, args.bytes, contentType);
    return serializeLocation({ v: 1, provider: "SUPABASE", path: supabasePath });
  }

  if (connection.provider === "DROPBOX") {
    const credentials = decryptCredentials<DropboxCredentials>(connection.encrypted_credentials);
    const remotePath = joinCloudPath(credentials.pathPrefix, objectName);
    await uploadDropboxObject(credentials, remotePath, args.bytes);
    return serializeLocation({ v: 1, provider: "DROPBOX", connectionId: connection.id, path: remotePath });
  }

  if (connection.provider === "WEBDAV") {
    const credentials = decryptCredentials<WebDavCredentials>(connection.encrypted_credentials);
    const remotePath = joinCloudPath(credentials.pathPrefix, objectName);
    await uploadWebDavObject(credentials, remotePath, args.bytes, contentType);
    return serializeLocation({ v: 1, provider: "WEBDAV", connectionId: connection.id, path: remotePath });
  }

  throw new Error("Unsupported cloud storage provider.");
}

export async function downloadVaultObject(userId: string, storagePath: string): Promise<VaultObject> {
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

  if (location.provider === "DROPBOX" && location.connectionId) {
    const connection = await getCloudConnection(userId, location.connectionId);
    const credentials = decryptCredentials<DropboxCredentials>(connection.encrypted_credentials);
    return downloadDropboxObject(credentials, location.path);
  }

  if (location.provider === "WEBDAV" && location.connectionId) {
    const connection = await getCloudConnection(userId, location.connectionId);
    const credentials = decryptCredentials<WebDavCredentials>(connection.encrypted_credentials);
    return downloadWebDavObject(credentials, location.path);
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

  throw new Error("Unsupported vault storage location.");
}

export async function deleteVaultObject(userId: string, storagePath: string): Promise<void> {
  const location = parseLocation(storagePath);

  if (location.provider === "SUPABASE") {
    await deleteSupabaseObject(location.path);
    return;
  }

  if (location.provider === "DROPBOX" && location.connectionId) {
    const connection = await getCloudConnection(userId, location.connectionId);
    const credentials = decryptCredentials<DropboxCredentials>(connection.encrypted_credentials);
    await deleteDropboxObject(credentials, location.path);
    return;
  }

  if (location.provider === "WEBDAV" && location.connectionId) {
    const connection = await getCloudConnection(userId, location.connectionId);
    const credentials = decryptCredentials<WebDavCredentials>(connection.encrypted_credentials);
    await deleteWebDavObject(credentials, location.path);
    return;
  }

  if (location.provider === "LOCAL") {
    if (fs.existsSync(location.path)) fs.unlinkSync(location.path);
  }
}