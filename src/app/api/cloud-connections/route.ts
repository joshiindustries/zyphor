import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

const REMOVED_MESSAGE = "External cloud connections have been removed. Zyphor Cloud storage is used for files.";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    return noStoreJson({ success: true, connections: [], disabled: true, message: REMOVED_MESSAGE });
  } catch (error) {
    console.error("Error fetching cloud connections:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  return noStoreJson({ error: REMOVED_MESSAGE }, { status: 410 });
}

export async function PATCH(_request: NextRequest) {
  return noStoreJson({ error: REMOVED_MESSAGE }, { status: 410 });
}

export async function DELETE(_request: NextRequest) {
  return noStoreJson({ error: REMOVED_MESSAGE }, { status: 410 });
}