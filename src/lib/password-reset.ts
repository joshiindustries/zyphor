const DEFAULT_PASSWORD_MANAGER_RESET_AT = "2026-07-25T06:30:00.000Z";

export function getPasswordManagerResetAt(): Date | null {
  const value = process.env.PASSWORD_MANAGER_RESET_AT || DEFAULT_PASSWORD_MANAGER_RESET_AT;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function passwordEntriesAfterResetWhere() {
  const resetAt = getPasswordManagerResetAt();
  return resetAt ? { created_at: { gte: resetAt } } : {};
}