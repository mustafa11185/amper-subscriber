import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const subscriberId = cookieStore.get("subscriber_id")?.value;

  if (!subscriberId) {
    return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
  });
  if (!subscriber) {
    return NextResponse.json({ error: "مشترك غير موجود" }, { status: 404 });
  }

  // Check for recent request (prevent spam — 1 per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.collectorCallRequest.findFirst({
    where: {
      subscriber_id: subscriber.id,
      requested_at: { gte: oneHourAgo },
    },
  });

  if (recent) {
    return NextResponse.json({ ok: true, message: "تم إرسال طلبك مسبقاً" });
  }

  await prisma.collectorCallRequest.create({
    data: {
      subscriber_id: subscriber.id,
      branch_id: subscriber.branch_id,
      status: "pending",
    },
  });

  await prisma.notification.create({
    data: {
      branch_id: subscriber.branch_id,
      tenant_id: subscriber.tenant_id,
      type: "collector_call",
      body: `${subscriber.name} طلب زيارتك`,
      is_read: false,
      payload: { subscriber_id: subscriber.id, subscriber_name: subscriber.name, target: "collector" },
    },
  });

  await prisma.notification.create({
    data: {
      branch_id: subscriber.branch_id,
      tenant_id: subscriber.tenant_id,
      type: "collector_call",
      body: `${subscriber.name} طلب الجابي`,
      is_read: false,
      payload: { subscriber_id: subscriber.id, subscriber_name: subscriber.name, target: "owner" },
    },
  });

  return NextResponse.json({ ok: true });
}
