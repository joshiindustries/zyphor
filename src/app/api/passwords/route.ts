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

    const passwords = await prisma.passwordEntry.findMany({
      where: { user_id: user.id },
      orderBy: { updated_at: 'desc' }
    });

    return noStoreJson({ success: true, passwords });
  } catch (error) {
    console.error("Error fetching passwords:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted_data } = await request.json();
    if (!encrypted_data || typeof encrypted_data !== "string") {
      return noStoreJson({ error: "Invalid encrypted_data" }, { status: 400 });
    }

    const password = await prisma.passwordEntry.create({
      data: {
        user_id: user.id,
        encrypted_data
      }
    });

    return noStoreJson({ success: true, password });
  } catch (error) {
    console.error("Error creating password:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
