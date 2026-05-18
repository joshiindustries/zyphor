function unquote(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}

function normalizeBaseUrl(rawUrl: string): string {
  let url = unquote(rawUrl).replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");
  url = url.replace(/\/storage\/v1$/i, "");
  return url;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes("your-project-ref") ||
    normalized.includes("<project-ref>") ||
    normalized.includes("your-supabase");
}

function encodeObjectPath(pathValue: string): string {
  return pathValue
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toSafeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

type SupabaseStorageConfig = {
  baseUrl: string;
  apiKey: string;
  bucket: string;
};

export class SupabaseStorageError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "SupabaseStorageError";
    this.status = status;
  }
}

export function isSupabaseStorageError(error: unknown): error is SupabaseStorageError {
  return error instanceof SupabaseStorageError;
}

function getConfigOrThrow(): SupabaseStorageConfig {
  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const rawServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const rawAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || "";
  const rawBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "";

  const baseUrl = rawUrl ? normalizeBaseUrl(rawUrl) : "";
  const bucket = rawBucket ? unquote(rawBucket) : "";
  const apiKey = rawServiceRole || rawAnonKey;

  if (!baseUrl || isPlaceholder(baseUrl)) {
    throw new SupabaseStorageError("SUPABASE_URL is missing or still a placeholder.", 503);
  }
  if (!bucket || isPlaceholder(bucket)) {
    throw new SupabaseStorageError("SUPABASE_STORAGE_BUCKET is missing or invalid.", 503);
  }
  if (!apiKey || isPlaceholder(apiKey)) {
    throw new SupabaseStorageError("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) is missing.", 503);
  }

  return { baseUrl, apiKey, bucket };
}

function authHeaders(apiKey: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
}

async function parseErrorBody(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return response.statusText || "Unknown storage error";
  try {
    const payload = JSON.parse(text);
    return payload?.message || payload?.error || payload?.msg || text;
  } catch {
    return text;
  }
}

export function assertSupabaseStorageConfigured(): void {
  const config = getConfigOrThrow();
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[storage] Active Supabase Storage host=${toSafeHost(config.baseUrl)} bucket=${config.bucket}`);
  }
}

export async function uploadSupabaseObject(pathValue: string, bytes: Uint8Array, contentType = "application/octet-stream"): Promise<void> {
  const config = getConfigOrThrow();
  const bucket = encodeURIComponent(config.bucket);
  const objectPath = encodeObjectPath(pathValue);
  const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const response = await fetch(`${config.baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: authHeaders(config.apiKey, {
      "Content-Type": contentType,
      "x-upsert": "false",
    }),
    body: payload,
  });

  if (!response.ok) {
    const detail = await parseErrorBody(response);
    throw new SupabaseStorageError(`Supabase upload failed (${response.status}): ${detail}`, response.status);
  }
}

export async function deleteSupabaseObject(pathValue: string): Promise<void> {
  const config = getConfigOrThrow();
  const bucket = encodeURIComponent(config.bucket);
  const objectPath = encodeObjectPath(pathValue);
  const response = await fetch(`${config.baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "DELETE",
    headers: authHeaders(config.apiKey),
  });

  if (response.status === 404) return;

  if (!response.ok) {
    const detail = await parseErrorBody(response);
    throw new SupabaseStorageError(`Supabase delete failed (${response.status}): ${detail}`, response.status);
  }
}

export async function downloadSupabaseObject(pathValue: string): Promise<Response> {
  const config = getConfigOrThrow();
  const bucket = encodeURIComponent(config.bucket);
  const objectPath = encodeObjectPath(pathValue);
  const response = await fetch(`${config.baseUrl}/storage/v1/object/authenticated/${bucket}/${objectPath}`, {
    method: "GET",
    headers: authHeaders(config.apiKey),
  });

  if (!response.ok) {
    const detail = await parseErrorBody(response);
    throw new SupabaseStorageError(`Supabase download failed (${response.status}): ${detail}`, response.status);
  }

  return response;
}
