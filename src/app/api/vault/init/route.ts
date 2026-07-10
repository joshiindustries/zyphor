import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { salt, validation } = body;

    if (!salt || !validation) {
      return NextResponse.json({ error: "Missing salt or validation payload." }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (dbUser.vault_salt && dbUser.vault_validation) {
      return NextResponse.json({ error: "Vault already initialized" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        vault_salt: salt,
        vault_validation: validation
      }
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
