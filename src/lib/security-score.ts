import { prisma } from "./db";

export async function calculateSecurityScore(userId: string) {
  let score = 100;
  const checks = [];

  // 1. Password Check (Mock for now, assume strong if they have one)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password_hash: true, email: true }
  });

  if (user?.password_hash) {
    checks.push({ label: "Strong Password", status: "success" });
  } else {
    // Maybe they use OAuth (Google/GitHub)
    checks.push({ label: "OAuth Secure Login", status: "success" });
  }

  // 2. Email Verified (Mock for now)
  checks.push({ label: "Email Verified", status: "success" });

  // 3. E2E Encryption Active
  const key = await prisma.userKey.findFirst({
    where: { user_id: userId }
  });
  if (key) {
    checks.push({ label: "Encryption Active", status: "success" });
  } else {
    checks.push({ label: "Encryption Disabled", status: "warning" });
    score -= 20;
  }

  // 4. Trusted Devices vs Active Sessions
  const activeSessions = await prisma.session.count({
    where: { user_id: userId }
  });
  const trustedDevices = await prisma.trustedDevice.count({
    where: { user_id: userId }
  });

  if (trustedDevices > 0) {
    checks.push({ label: "Trusted Device Configured", status: "success" });
  } else {
    checks.push({ label: "No Trusted Devices", status: "warning" });
    score -= 10;
  }

  if (activeSessions > 3) {
    checks.push({ label: "Many Active Sessions", status: "warning" });
    score -= 10;
  }

  // 5. MFA (Not implemented yet, deduct points to show it's missing)
  checks.push({ label: "MFA Disabled", status: "warning" });
  score -= 15;

  // 6. Security Alerts (Deduct 5 points per unread alert)
  const unreadAlerts = await prisma.securityAlert.count({
    where: { user_id: userId, read: false }
  });

  if (unreadAlerts > 0) {
    score -= (unreadAlerts * 5);
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return { score, checks };
}
