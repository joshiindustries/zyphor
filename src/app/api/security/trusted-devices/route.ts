import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const devices = await prisma.trustedDevice.findMany({
      where: { user_id: user.id },
      orderBy: { last_active: 'desc' }
    });

    return NextResponse.json({ success: true, devices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing device ID" }, { status: 400 });

    const device = await prisma.trustedDevice.findUnique({ where: { id } });
    if (!device || device.user_id !== user.id) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    await prisma.trustedDevice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
