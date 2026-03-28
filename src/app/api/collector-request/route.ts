import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
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

    // Prevent spam — 1 request per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.collectorCallRequest.findFirst({
      where: {
        subscriber_id: subscriber.id,
        requested_at: { gte: oneHourAgo },
        status: "pending",
      },
    });

    if (recent) {
      return NextResponse.json({ ok: true, message: "تم إرسال طلبك مسبقاً" });
    }

    // Create request
    await prisma.collectorCallRequest.create({
      data: {
        subscriber_id: subscriber.id,
        branch_id: subscriber.branch_id,
        status: "pending",
      },
    });

    const address = subscriber.address || subscriber.alley || "";

    // Notification for collector
    await prisma.notification.create({
      data: {
        branch_id: subscriber.branch_id,
        tenant_id: subscriber.tenant_id,
        type: "collector_call",
        title: "طلب زيارة",
        body: `📞 ${subscriber.name} يطلب زيارتك${address ? " — " + address : ""}`,
        is_read: false,
        payload: {
          subscriber_id: subscriber.id,
          subscriber_name: subscriber.name,
          subscriber_address: address,
          target: "collector",
        },
      },
    });

    // Notification for owner/manager
    await prisma.notification.create({
      data: {
        branch_id: subscriber.branch_id,
        tenant_id: subscriber.tenant_id,
        type: "collector_call_manager",
        title: "طلب زيارة الجابي",
        body: `📞 ${subscriber.name} طلب زيارة الجابي${address ? " — " + address : ""}`,
        is_read: false,
        payload: {
          subscriber_id: subscriber.id,
          subscriber_name: subscriber.name,
          subscriber_address: address,
          target: "owner",
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[collector-request] Error:", error?.message || error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
