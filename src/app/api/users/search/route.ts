import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return noStoreJson({ success: true, users: [] });
    }

    // Search by prefix for username or email
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        OR: [
          { username: { startsWith: query, mode: "insensitive" } },
          { email: { startsWith: query, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true
      },
      take: 10
    });

    return noStoreJson({ success: true, users });
  } catch (error) {
    console.error("Error searching users:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
