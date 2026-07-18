import nodemailer from "nodemailer";

const REPORT_WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_LENGTH = 8000;

type ErrorGlobal = typeof globalThis & {
  __zyphorErrorReporterInstalled?: boolean;
  __zyphorOriginalConsoleError?: typeof console.error;
  __zyphorErrorReportCache?: Map<string, number>;
};

function getGlobal(): ErrorGlobal {
  return globalThis as ErrorGlobal;
}

function originalConsoleError(): typeof console.error {
  return getGlobal().__zyphorOriginalConsoleError || console.error.bind(console);
}

function getRecipient(): string | null {
  return (process.env.ERROR_REPORT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER || "").trim() || null;
}

function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && getRecipient());
}

function stringifyPart(part: unknown): string {
  if (part instanceof Error) {
    return `${part.name}: ${part.message}\n${part.stack || ""}`.trim();
  }

  if (typeof part === "string") return part;

  try {
    return JSON.stringify(part, null, 2);
  } catch {
    return String(part);
  }
}

function fingerprint(context: string, parts: unknown[]): string {
  const text = `${context}\n${parts.map(stringifyPart).join("\n")}`;
  return text.slice(0, 500);
}

function shouldSend(context: string, parts: unknown[]): boolean {
  const cache = getGlobal().__zyphorErrorReportCache || new Map<string, number>();
  getGlobal().__zyphorErrorReportCache = cache;

  const key = fingerprint(context, parts);
  const now = Date.now();
  const last = cache.get(key) || 0;
  if (now - last < REPORT_WINDOW_MS) return false;

  cache.set(key, now);
  for (const [cacheKey, timestamp] of cache.entries()) {
    if (now - timestamp > REPORT_WINDOW_MS) cache.delete(cacheKey);
  }
  return true;
}

export async function reportServerError(context: string, ...parts: unknown[]) {
  if (process.env.ERROR_REPORT_EMAILS === "false") return;
  if (!isMailerConfigured()) return;
  if (!shouldSend(context, parts)) return;

  const recipient = getRecipient();
  if (!recipient) return;

  const body = parts.map(stringifyPart).join("\n\n").slice(0, MAX_BODY_LENGTH);
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Zyphor Error Monitor" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `[Zyphor Error] ${context}`.slice(0, 180),
      text: [
        `Context: ${context}`,
        `Time: ${new Date().toISOString()}`,
        `Node env: ${process.env.NODE_ENV || "unknown"}`,
        "",
        body || "No error details provided.",
      ].join("\n"),
    });
  } catch (mailError) {
    originalConsoleError()("Failed to send Zyphor error report email:", mailError);
  }
}

export function installServerErrorEmailReporter() {
  const g = getGlobal();
  if (g.__zyphorErrorReporterInstalled) return;

  g.__zyphorErrorReporterInstalled = true;
  g.__zyphorOriginalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    g.__zyphorOriginalConsoleError?.(...args);
    void reportServerError("server console.error", ...args);
  };

  process.on("unhandledRejection", (reason) => {
    void reportServerError("unhandledRejection", reason);
  });

  process.on("uncaughtException", (error) => {
    void reportServerError("uncaughtException", error);
  });
}
