import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
import {
  CloudProvider,
  encryptCredentials,
  sanitizeCloudConnection,
  validateDropboxCredentials,
  validateWebDavCredentials,
} from "@/lib/cloud-credentials";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = new Set<CloudProvider>(["DROPBOX", "WEBDAV"]);

function parseProvider(value: unknown): CloudProvider {
  if (typeof value !== "string") {
    throw new Error("Provider is required.");
  }

  const provider = value.trim().toUpperCase() as CloudProvider;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    throw new Error("Unsupported cloud provider.");
  }

  return provider;
}

function normalizeName(value: unknown, provider: CloudProvider): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name) return name.slice(0, 80);
  return provider === "DROPBOX" ? "Dropbox" : "Own Cloud";
}

function validateCredentials(provider: CloudProvider, config: unknown) {
  if (provider === "DROPBOX") return validateDropboxCredentials(config);
  return validateWebDavCredentials(config);
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const connections = await prisma.cloudConnection.findMany({
      where: { user_id: user.id },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    });

    return noStoreJson({
      success: true,
      connections: connections.map(sanitizeCloudConnection),
    });
  } catch (error) {
    console.error("Error fetching cloud connections:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const provider = parseProvider(body?.provider);
    const credentials = validateCredentials(provider, body?.config);
    const name = normalizeName(body?.name, provider);
    const shouldDefault = Boolean(body?.is_default);

    const connection = await prisma.$transaction(async (tx: any) => {
      if (shouldDefault) {
        await tx.cloudConnection.updateMany({
          where: { user_id: user.id },
          data: { is_default: false },
        });
      }

      const existingCount = await tx.cloudConnection.count({ where: { user_id: user.id } });

      return tx.cloudConnection.create({
        data: {
          user_id: user.id,
          provider,
          name,
          encrypted_credentials: encryptCredentials(credentials),
          is_default: shouldDefault || existingCount === 0,
        },
      });
    });

    return noStoreJson({ success: true, connection: sanitizeCloudConnection(connection) }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating cloud connection:", error);
    return noStoreJson({ error: error.message || "Internal server error" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return noStoreJson({ error: "Connection id is required." }, { status: 400 });

    const existing = await prisma.cloudConnection.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return noStoreJson({ error: "Cloud connection not found." }, { status: 404 });
    }

    const provider = existing.provider as CloudProvider;
    const updateData: { name?: string; encrypted_credentials?: string; is_default?: boolean } = {};

    if (body?.name !== undefined) {
      updateData.name = normalizeName(body.name, provider);
    }

    if (body?.config !== undefined) {
      updateData.encrypted_credentials = encryptCredentials(validateCredentials(provider, body.config));
    }

    if (body?.is_default !== undefined) {
      updateData.is_default = Boolean(body.is_default);
    }

    const connection = await prisma.$transaction(async (tx: any) => {
      if (updateData.is_default === true) {
        await tx.cloudConnection.updateMany({
          where: { user_id: user.id, id: { not: id } },
          data: { is_default: false },
        });
      }

      return tx.cloudConnection.update({
        where: { id },
        data: updateData,
      });
    });

    return noStoreJson({ success: true, connection: sanitizeCloudConnection(connection) });
  } catch (error: any) {
    console.error("Error updating cloud connection:", error);
    return noStoreJson({ error: error.message || "Internal server error" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    if (!id) return noStoreJson({ error: "Connection id is required." }, { status: 400 });

    const existing = await prisma.cloudConnection.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return noStoreJson({ error: "Cloud connection not found." }, { status: 404 });
    }

    await prisma.cloudConnection.delete({ where: { id } });

    if (existing.is_default) {
      const fallback = await prisma.cloudConnection.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: "asc" },
      });

      if (fallback) {
        await prisma.cloudConnection.update({
          where: { id: fallback.id },
          data: { is_default: true },
        });
      }
    }

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting cloud connection:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}