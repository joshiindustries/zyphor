import crypto from "crypto";

export type CloudProvider = "DROPBOX" | "WEBDAV";

export type DropboxCredentials = {
  accessToken: string;
  pathPrefix?: string;
};

export type WebDavCredentials = {
  endpoint: string;
  username: string;
  password: string;
  pathPrefix?: string;
};

export type CloudCredentials = DropboxCredentials | WebDavCredentials;

type EncryptedPayload = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function getCredentialKey(): Buffer {
  const secret = process.env.CLOUD_CREDENTIAL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("Set CLOUD_CREDENTIAL_SECRET or NEXTAUTH_SECRET to encrypt cloud credentials.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptCredentials(credentials: CloudCredentials): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCredentialKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);

  const payload: EncryptedPayload = {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptCredentials<T extends CloudCredentials>(encryptedValue: string): T {
  const payload = JSON.parse(encryptedValue) as EncryptedPayload;
  if (payload.v !== 1) {
    throw new Error("Unsupported cloud credential payload version.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

export function normalizePathPrefix(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function validateDropboxCredentials(config: unknown): DropboxCredentials {
  const input = config as Record<string, unknown> | null;
  const accessToken = typeof input?.accessToken === "string" ? input.accessToken.trim() : "";
  if (!accessToken) {
    throw new Error("Dropbox access token is required.");
  }

  return {
    accessToken,
    pathPrefix: normalizePathPrefix(input?.pathPrefix),
  };
}

export function validateWebDavCredentials(config: unknown): WebDavCredentials {
  const input = config as Record<string, unknown> | null;
  const endpoint = typeof input?.endpoint === "string" ? input.endpoint.trim().replace(/\/+$/, "") : "";
  const username = typeof input?.username === "string" ? input.username.trim() : "";
  const password = typeof input?.password === "string" ? input.password : "";

  if (!endpoint) {
    throw new Error("WebDAV endpoint is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("WebDAV endpoint must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("WebDAV endpoint must use http or https.");
  }

  if (!username || !password) {
    throw new Error("WebDAV username and password are required.");
  }

  return {
    endpoint,
    username,
    password,
    pathPrefix: normalizePathPrefix(input?.pathPrefix),
  };
}

export function sanitizeCloudConnection(connection: {
  id: string;
  provider: string;
  name: string;
  encrypted_credentials: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  let details: Record<string, string | boolean> = {};

  try {
    if (connection.provider === "DROPBOX") {
      const credentials = decryptCredentials<DropboxCredentials>(connection.encrypted_credentials);
      details = {
        pathPrefix: credentials.pathPrefix || "/",
        hasAccessToken: Boolean(credentials.accessToken),
      };
    }

    if (connection.provider === "WEBDAV") {
      const credentials = decryptCredentials<WebDavCredentials>(connection.encrypted_credentials);
      const url = new URL(credentials.endpoint);
      details = {
        host: url.host,
        pathPrefix: credentials.pathPrefix || "/",
        username: credentials.username,
      };
    }
  } catch {
    details = { unavailable: true };
  }

  return {
    id: connection.id,
    provider: connection.provider,
    name: connection.name,
    is_default: connection.is_default,
    created_at: connection.created_at.toISOString(),
    updated_at: connection.updated_at.toISOString(),
    details,
  };
}