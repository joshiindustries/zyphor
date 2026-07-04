import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
import { calculateSecurityScore } from "@/lib/security-score";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { score, checks } = await calculateSecurityScore(user.id);

    const loginHistory = await prisma.loginHistory.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    const activeSessions = await prisma.session.findMany({
      where: { user_id: user.id },
      orderBy: { expires_at: 'desc' }
    });

    const trustedDevices = await prisma.trustedDevice.findMany({
      where: { user_id: user.id },
      orderBy: { last_active: 'desc' }
    });

    const alerts = await prisma.securityAlert.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return noStoreJson({
      success: true,
      score,
      checks,
      loginHistory,
      activeSessions,
      trustedDevices,
      alerts
    });
  } catch (error) {
    console.error("Error fetching security dashboard:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
