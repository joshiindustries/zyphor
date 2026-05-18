import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from "fs";
import path from "path";

function readDatabaseUrlFromDotEnv(): string | null {
  if (process.env.NODE_ENV === "production") return null;

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return null;

    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;

      const key = trimmed.slice(0, idx).trim();
      const rawValue = trimmed.slice(idx + 1).trim();
      if (key === "DATABASE_URL") {
        return rawValue.replace(/^"(.*)"$/, "$1").trim();
      }
    }
  } catch {
    // Ignore and fall back to process env
  }

  return null;
}

function getSafeTarget(value: string): string {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function getConnectionString(): string {
  const envValue = process.env.DATABASE_URL?.trim() || "";
  const dotEnvValue = readDatabaseUrlFromDotEnv() || "";
  const value = dotEnvValue || envValue;

  if (!value) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (dotEnvValue && envValue && dotEnvValue !== envValue) {
    console.warn(
      `[db] DATABASE_URL mismatch detected. Using .env target=${getSafeTarget(dotEnvValue)} instead of process env target=${getSafeTarget(envValue)}.`
    );
  }

  if (value.includes("db.your-project-ref.supabase.co")) {
    throw new Error("DATABASE_URL is still a placeholder. Replace it with your real Supabase Postgres connection string.");
  }

  return value;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getConnectionString() });
  if (process.env.PRISMA_LOG_QUERIES === "true") {
    return new PrismaClient({ adapter, log: ["query", "error", "warn"] });
  }
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaHostLogged: boolean | undefined
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;

  if (!globalForPrisma.prismaHostLogged) {
    const dotEnvValue = readDatabaseUrlFromDotEnv() || "";
    const envValue = process.env.DATABASE_URL?.trim() || "";
    const chosen = dotEnvValue || envValue;
    console.warn(`[db] Active Prisma target=${getSafeTarget(chosen)} source=${dotEnvValue ? ".env" : "process.env"}`);
    globalForPrisma.prismaHostLogged = true;
  }
}
