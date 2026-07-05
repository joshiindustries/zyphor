import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { VaultClient } from "./VaultClient";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const initialFiles = await prisma.vaultFile.findMany({
    where: { user_id: sessionUser.id },
    orderBy: { created_at: "desc" }
  });

  return <VaultClient initialFiles={initialFiles} />;
}
