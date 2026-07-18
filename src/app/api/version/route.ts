import { noStoreJson } from "@/lib/security";
import { getAppVersionInfo } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return noStoreJson(getAppVersionInfo());
}
