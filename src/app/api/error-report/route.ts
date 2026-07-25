import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { noStoreJson } from "@/lib/security";
import { getErrorEmailStatus, reportServerError } from "@/lib/error-reporting";

export const dynamic = "force-dynamic";

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, maxLength);
}

export async function GET() {
  const user = await getUser();
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  return noStoreJson({ success: true, email: getErrorEmailStatus() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = cleanString(body.message, 1000) || "Client error";
    const source = cleanString(body.source, 500);
    const stack = cleanString(body.stack, 4000);
    const userAgent = cleanString(body.userAgent, 500);
    const url = cleanString(body.url, 1000);
    const status = typeof body.status === "number" ? body.status : null;
    const statusText = cleanString(body.statusText, 300);

    const email = await reportServerError("client browser error", {
      message,
      source,
      stack,
      status,
      statusText,
      userAgent,
      url,
      time: new Date().toISOString(),
    });

    return noStoreJson({ success: true, email });
  } catch (error) {
    console.error("Error reporting client error:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}