export type CloudCredentials = Record<string, never>;

export function encryptCredentials(_credentials: CloudCredentials): string {
  throw new Error("External cloud connectors are disabled.");
}

export function decryptCredentials<T extends CloudCredentials>(_encryptedValue: string): T {
  throw new Error("External cloud connectors are disabled.");
}

export function normalizePathPrefix(_value: unknown): string {
  return "";
}

export function sanitizeCloudConnection(connection: {
  id: string;
  provider: string;
  name: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: connection.id,
    provider: connection.provider,
    name: connection.name,
    is_default: connection.is_default,
    created_at: connection.created_at.toISOString(),
    updated_at: connection.updated_at.toISOString(),
    details: { disabled: true },
  };
}