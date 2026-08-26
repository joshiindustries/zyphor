import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const calendars = await prisma.eventCalendar.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "asc" }
    });

    return noStoreJson({ success: true, calendars });
  } catch (error) {
    console.error("Error fetching calendars:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted_name, color_hex } = await request.json();

    if (!encrypted_name) {
      return noStoreJson({ error: "encrypted_name is required" }, { status: 400 });
    }

    const calendar = await prisma.eventCalendar.create({
      data: {
        user_id: user.id,
        encrypted_name,
        color_hex: color_hex || "#e74c3c"
      }
    });

    return noStoreJson({ success: true, calendar });
  } catch (error) {
    console.error("Error creating calendar:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
