import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { getErrorEmailStatus, reportServerError } from "@/lib/error-reporting";
import { noStoreJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  return noStoreJson({ success: true, email: getErrorEmailStatus() });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const email = await reportServerError("manual error email test", {
    triggeredBy: user.email || user.id,
    url: request.nextUrl.origin,
    time: new Date().toISOString(),
    message: "This is a test error email from Zyphor.",
  });

  return noStoreJson({ success: email.sent, email, status: getErrorEmailStatus() }, { status: email.sent ? 200 : 500 });
}