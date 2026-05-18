import { prisma } from '@/lib/db';

const memoryRateLimits = new Map<string, number[]>();

function memoryRateLimitKey(identifier: string, action: string): string {
  return `${action}:${identifier}`;
}

function checkMemoryRateLimit(key: string, limit: number, windowMinutes: number): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60_000;
  const attempts = memoryRateLimits.get(key) || [];
  const activeAttempts = attempts.filter((ts) => now - ts < windowMs);

  if (activeAttempts.length >= limit) {
    memoryRateLimits.set(key, activeAttempts);
    return false;
  }

  activeAttempts.push(now);
  memoryRateLimits.set(key, activeAttempts);
  return true;
}

function clearMemoryRateLimit(key: string) {
  memoryRateLimits.delete(key);
}

/**
 * Validates and records a rate limit attempt.
 * @param identifier e.g., IP address or Email
 * @param action e.g., 'login', 'upload'
 * @param limit max allowed attempts within the window
 * @param windowMinutes time window in minutes
 * @returns true if allowed, false if rate limited
 */
export async function checkRateLimit(identifier: string, action: string, limit: number, windowMinutes: number): Promise<boolean> {
  const safeIdentifier = identifier.slice(0, 200);
  const safeAction = action.slice(0, 64);
  const key = memoryRateLimitKey(safeIdentifier, safeAction);

  try {
    const now = new Date();
    
    // Count current active attempts
    const activeAttempts = await prisma.rateLimit.count({
      where: {
        identifier: safeIdentifier,
        action: safeAction,
        expires_at: { gt: now }
      }
    });
      
    // Reject if limit exceeded
    if (activeAttempts >= limit) {
      return false; 
    }

    // Record new attempt
    const expiresAt = new Date(now.getTime() + windowMinutes * 60000);
    await prisma.rateLimit.create({
      data: {
        identifier: safeIdentifier,
        action: safeAction,
        expires_at: expiresAt,
      }
    });
    
    return true;
  } catch (error) {
    console.error('Rate Limit DB Error:', error);
    // Use in-memory fallback if DB is unavailable to avoid unrestricted abuse.
    return checkMemoryRateLimit(key, limit, windowMinutes);
  }
}

/**
 * Clears current rate limit counts for an identifier/action combo
 */
export async function clearRateLimit(identifier: string, action: string) {
  const safeIdentifier = identifier.slice(0, 200);
  const safeAction = action.slice(0, 64);
  const key = memoryRateLimitKey(safeIdentifier, safeAction);

  try {
    await prisma.rateLimit.deleteMany({
      where: {
        identifier: safeIdentifier,
        action: safeAction
      }
    });
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
  } finally {
    clearMemoryRateLimit(key);
  }
}
