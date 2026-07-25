import nodemailer from "nodemailer";

const REPORT_WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_LENGTH = 8000;
const CONFIG_WARNING_WINDOW_MS = 5 * 60 * 1000;

type ErrorGlobal = typeof globalThis & {
  __zyphorErrorReporterInstalled?: boolean;
  __zyphorOriginalConsoleError?: typeof console.error;
  __zyphorErrorReportCache?: Map<string, number>;
  __zyphorErrorConfigWarnings?: Map<string, number>;
};

export type ErrorEmailStatus = {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  recipient: string | null;
  smtp: {
    service: string | null;
    host: string | null;
    port: number | null;
    secure: boolean | null;
    userConfigured: boolean;
    passwordConfigured: boolean;
  };
};

export type ErrorReportResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  recipient?: string | null;
  error?: string;
};

function getGlobal(): ErrorGlobal {
  return globalThis as ErrorGlobal;
}

function originalConsoleError(): typeof console.error {
  return getGlobal().__zyphorOriginalConsoleError || console.error.bind(console);
}

function cleanEnv(value: string | undefined): string {
  return (value || "").replace(/\0/g, "").trim();
}

function firstEnv(keys: string[]): string {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);
    if (value) return value;
  }
  return "";
}

function parsePort(value: string): number | null {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : null;
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

function isDisabled(): boolean {
  return cleanEnv(process.env.ERROR_REPORT_EMAILS).toLowerCase() === "false";
}

function getSmtpUser(): string {
  return firstEnv(["SMTP_USER", "MAIL_USER", "EMAIL_USER", "GMAIL_USER"]);
}

function getSmtpPass(): string {
  return firstEnv(["SMTP_PASS", "SMTP_PASSWORD", "MAIL_PASS", "MAIL_PASSWORD", "EMAIL_PASS", "GMAIL_APP_PASSWORD"]);
}

function getRecipient(): string | null {
  return firstEnv(["ERROR_REPORT_EMAIL", "ERROR_REPORT_TO", "ADMIN_EMAIL", "ALERT_EMAIL", "SMTP_USER", "MAIL_USER", "EMAIL_USER"]) || null;
}

function maskEmail(value: string | null): string | null {
  if (!value) return null;
  const [name, domain] = value.split("@");
  if (!domain) return value.slice(0, 2) + "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function getErrorEmailStatus(): ErrorEmailStatus {
  const smtpUser = getSmtpUser();
  const smtpPass = getSmtpPass();
  const recipient = getRecipient();
  const host = firstEnv(["SMTP_HOST", "MAIL_HOST"]);
  const port = parsePort(firstEnv(["SMTP_PORT", "MAIL_PORT"]));
  const secure = parseBoolean(firstEnv(["SMTP_SECURE", "MAIL_SECURE"])) ?? (port === 465 ? true : null);
  const service = host ? null : firstEnv(["SMTP_SERVICE", "MAIL_SERVICE"]) || "gmail";
  const missing: string[] = [];

  if (!smtpUser) missing.push("SMTP_USER");
  if (!smtpPass) missing.push("SMTP_PASS");
  if (!recipient) missing.push("ERROR_REPORT_EMAIL or SMTP_USER");

  return {
    enabled: !isDisabled(),
    configured: !isDisabled() && missing.length === 0,
    missing,
    recipient: maskEmail(recipient),
    smtp: {
      service,
      host: host || null,
      port,
      secure,
      userConfigured: Boolean(smtpUser),
      passwordConfigured: Boolean(smtpPass),
    },
  };
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

function warnConfigOnce(reason: string) {
  const cache = getGlobal().__zyphorErrorConfigWarnings || new Map<string, number>();
  getGlobal().__zyphorErrorConfigWarnings = cache;

  const now = Date.now();
  const last = cache.get(reason) || 0;
  if (now - last < CONFIG_WARNING_WINDOW_MS) return;

  cache.set(reason, now);
  originalConsoleError()(`Zyphor error email skipped: ${reason}`);
}

function createTransporter() {
  const smtpUser = getSmtpUser();
  const smtpPass = getSmtpPass();
  const host = firstEnv(["SMTP_HOST", "MAIL_HOST"]);
  const port = parsePort(firstEnv(["SMTP_PORT", "MAIL_PORT"]));
  const secure = parseBoolean(firstEnv(["SMTP_SECURE", "MAIL_SECURE"])) ?? port === 465;

  if (host) {
    return nodemailer.createTransport({
      host,
      port: port || 587,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  return nodemailer.createTransport({
    service: firstEnv(["SMTP_SERVICE", "MAIL_SERVICE"]) || "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });
}

export async function reportServerError(context: string, ...parts: unknown[]): Promise<ErrorReportResult> {
  const status = getErrorEmailStatus();
  if (!status.enabled) return { sent: false, skipped: true, reason: "disabled" };
  if (!status.configured) {
    const reason = `missing ${status.missing.join(", ")}`;
    warnConfigOnce(reason);
    return { sent: false, skipped: true, reason };
  }
  if (!shouldSend(context, parts)) return { sent: false, skipped: true, reason: "duplicate_throttled" };

  const recipient = getRecipient();
  if (!recipient) return { sent: false, skipped: true, reason: "missing recipient" };

  const smtpUser = getSmtpUser();
  const from = firstEnv(["ERROR_REPORT_FROM", "SMTP_FROM", "MAIL_FROM"]) || `"Zyphor Error Monitor" <${smtpUser}>`;
  const body = parts.map(stringifyPart).join("\n\n").slice(0, MAX_BODY_LENGTH);
  const transporter = createTransporter();

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      subject: `[Zyphor Error] ${context}`.slice(0, 180),
      text: [
        `Context: ${context}`,
        `Time: ${new Date().toISOString()}`,
        `Node env: ${process.env.NODE_ENV || "unknown"}`,
        `App version: ${process.env.NEXT_PUBLIC_APP_VERSION || "unknown"}`,
        "",
        body || "No error details provided.",
      ].join("\n"),
    });

    return { sent: true, skipped: false, recipient: maskEmail(recipient) };
  } catch (mailError) {
    const message = stringifyPart(mailError).slice(0, 1000);
    originalConsoleError()("Failed to send Zyphor error report email:", mailError);
    return { sent: false, skipped: false, reason: "send_failed", error: message, recipient: maskEmail(recipient) };
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