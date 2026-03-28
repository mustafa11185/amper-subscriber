import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// FuratPay webhook handler

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, status, transaction_id, amount } = body;

    console.log("[subscriber furatpay-callback]", JSON.stringify(body, null, 2));

    if (!order_id || !status) return NextResponse.json({ ok: false }, { status: 400 });

    const onlinePayment = await prisma.onlinePayment.findFirst({ where: { gateway_ref: order_id } });
    if (!onlinePayment) return NextResponse.json({ ok: false });

    const isApproved = status === "success" || status === "paid";

    if (isApproved) {
      await prisma.$transaction(async (tx) => {
        await tx.onlinePayment.update({
          where: { id: onlinePayment.id },
          data: { status: "success", gateway_ref: transaction_id || order_id },
        });
        if (onlinePayment.invoice_id) {
          const invoice = await tx.invoice.findUnique({
            where: { id: onlinePayment.invoice_id },
            include: { subscriber: { select: { name: true } } },
          });
          if (invoice && !invoice.is_fully_paid) {
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { is_fully_paid: true, amount_paid: invoice.total_amount_due, payment_method: "furatpay" },
            });
            await tx.notification.create({
              data: {
                branch_id: invoice.branch_id, tenant_id: invoice.tenant_id,
                type: "payment_online", title: "دفع إلكتروني",
                body: `💳 ${invoice.subscriber?.name ?? ""} دفع إلكترونياً — ${Number(amount).toLocaleString()} د.ع`,
                payload: { invoice_id: invoice.id, transaction_id, amount: Number(amount) },
              },
            });
            await tx.notification.create({
              data: {
                branch_id: invoice.branch_id, tenant_id: invoice.tenant_id,
                type: "payment_confirmed", title: "تم استلام دفعتك",
                body: `✅ تم استلام دفعتك — ${Number(amount).toLocaleString()} د.ع. شكراً!`,
                payload: { subscriber_id: onlinePayment.subscriber_id, transaction_id, amount: Number(amount) },
              },
            });
          }
        } else if (onlinePayment.subscriber_id) {
          const subscriber = await tx.subscriber.findUnique({ where: { id: onlinePayment.subscriber_id } });
          if (subscriber) {
            await tx.subscriber.update({
              where: { id: subscriber.id },
              data: { total_debt: Math.max(0, Number(subscriber.total_debt) - Number(onlinePayment.amount)) },
            });
          }
        }
      });
    } else {
      await prisma.onlinePayment.update({
        where: { id: onlinePayment.id },
        data: { status: status === "declined" ? "declined" : "failed", gateway_ref: transaction_id || order_id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[subscriber furatpay-callback] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
