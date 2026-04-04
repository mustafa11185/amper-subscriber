import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/payment-service";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const subscriberId = cookieStore.get("subscriber_id")?.value;
    if (!subscriberId) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });

    const { invoice_id, amount, payment_method } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      include: { branch: true },
    });
    if (!subscriber) return NextResponse.json({ error: "مشترك غير موجود" }, { status: 404 });

    const branch = subscriber.branch;

    // ZainCash — no real gateway, return merchant info for manual payment
    if (payment_method === 'zaincash') {
      await prisma.onlinePayment.create({
        data: {
          subscriber_id: subscriber.id,
          tenant_id: subscriber.tenant_id,
          invoice_id: invoice_id || null,
          amount,
          gateway: 'zaincash',
          gateway_ref: `ZAIN-${subscriber.id}-${Date.now()}`,
          status: 'pending',
        },
      });

      return NextResponse.json({
        payment_url: null,
        zaincash: true,
        merchant_phone: (branch as any).zaincash_phone ?? null,
        amount,
        expires_in: 900,
      });
    }

    // Card payments (qi_card, visa) — use configured gateway
    if (!branch.is_online_payment_enabled || branch.active_gateway === "none") {
      return NextResponse.json({ error: "الدفع الإلكتروني غير مفعّل" }, { status: 400 });
    }

    const pricing = await prisma.monthlyPricing.findFirst({
      where: { branch_id: branch.id },
      orderBy: { effective_from: "desc" },
    });
    const billingMonth = pricing ? new Date(pricing.effective_from).getMonth() + 1 : new Date().getMonth() + 1;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    const callbackPath = branch.active_gateway === "aps" ? "aps-callback" : "furatpay-callback";

    const result = await createPayment(branch as any, {
      invoice_id: invoice_id || null,
      subscriber_id: subscriber.id,
      subscriber_name: subscriber.name,
      subscriber_phone: subscriber.phone || "",
      amount,
      billing_month: billingMonth,
      return_url: `${baseUrl}/payment/success`,
      callback_url: `${baseUrl}/api/payment/${callbackPath}`,
    });

    await prisma.onlinePayment.create({
      data: {
        subscriber_id: subscriber.id,
        tenant_id: subscriber.tenant_id,
        invoice_id: invoice_id || null,
        amount,
        gateway: result.gateway,
        gateway_ref: result.order_id,
        status: "pending",
      },
    });

    return NextResponse.json({ payment_url: result.payment_url, order_id: result.order_id, gateway: result.gateway });
  } catch (err: any) {
    console.error("[subscriber payment/init] Error:", err);
    return NextResponse.json({ error: err.message || "خطأ" }, { status: 500 });
  }
}
