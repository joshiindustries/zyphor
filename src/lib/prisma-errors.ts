type PrismaErrorLike = {
  code?: string;
  message?: string;
  cause?: unknown;
  meta?: unknown;
};

function asMessage(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function isPrismaDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const prismaError = error as PrismaErrorLike;
  const message = asMessage(prismaError.message);
  const stack = "stack" in (error as Record<string, unknown>) ? asMessage((error as { stack?: unknown }).stack) : "";
  const nestedCause =
    prismaError.cause && typeof prismaError.cause === "object" && "message" in prismaError.cause
      ? asMessage((prismaError.cause as { message?: unknown }).message)
      : "";
  const text = `${message}\n${nestedCause}\n${stack}`.toLowerCase();

  if (prismaError.code === "P1001") return true;
  if (prismaError.code === "P1002") return true;
  if (text.includes("can't reach database server")) return true;
  if (text.includes("database not reachable")) return true;
  if (text.includes("databasenotreachable")) return true;

  return false;
}

export function isPrismaSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const prismaError = error as PrismaErrorLike;
  const message = asMessage(prismaError.message).toLowerCase();
  const stack = "stack" in (error as Record<string, unknown>) ? asMessage((error as { stack?: unknown }).stack).toLowerCase() : "";

  if (prismaError.code === "P2021") return true;
  if (message.includes("table does not exist")) return true;
  if (message.includes("relation") && message.includes("does not exist")) return true;
  if (stack.includes("tabledoesnotexist")) return true;

  return false;
}

export function isPrismaClientOutOfSyncError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const prismaError = error as PrismaErrorLike;
  const message = asMessage(prismaError.message).toLowerCase();
  const stack = "stack" in (error as Record<string, unknown>) ? asMessage((error as { stack?: unknown }).stack).toLowerCase() : "";

  if (message.includes("unknown argument `auth_required`")) return true;
  if (message.includes("unknown argument 'auth_required'")) return true;
  if (stack.includes("unknown argument `auth_required`")) return true;

  return false;
}

export function databaseUnavailableMessage(context: string): string {
  return `${context} is temporarily unavailable. Verify DATABASE_URL and that the Supabase database is reachable.`;
}

export function schemaMissingMessage(context: string): string {
  return `${context} cannot run because required database tables are missing. Run the Supabase SQL migration and Prisma generate.`;
}

export function prismaClientOutOfSyncMessage(context: string): string {
  return `${context} is running with a stale Prisma client. Run 'npx prisma generate' and fully restart the Next.js dev server.`;
}
