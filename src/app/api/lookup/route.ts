import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "الكود غير صحيح" }, { status: 400 });
  }

  const subscriber = await prisma.subscriber.findFirst({
    where: { access_code: code, is_active: true },
    include: { branch: { select: { name: true } } },
  });

  if (!subscriber) {
    return NextResponse.json({ error: "الكود غير صحيح" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("subscriber_id", subscriber.id, {
    httpOnly: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: "lax",
  });

  return NextResponse.json({
    ok: true,
    subscriber_id: subscriber.id,
    name: subscriber.name,
    branch_name: subscriber.branch.name,
  });
}
