import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const subscriberId = cookieStore.get('subscriber_id')?.value
    if (!subscriberId) {
      return NextResponse.json({ error: 'غير مسجل' }, { status: 401 })
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { id: true, tenant_id: true },
    })
    if (!subscriber) {
      return NextResponse.json({ error: 'مشترك غير موجود' }, { status: 404 })
    }

    // Get invoices with payment info (invoices track payments)
    const invoices = await prisma.invoice.findMany({
      where: { subscriber_id: subscriberId },
      orderBy: [{ billing_year: 'desc' }, { billing_month: 'desc' }],
      take: 20,
    })

    // Get online payments for this subscriber
    const onlinePayments = await prisma.onlinePayment.findMany({
      where: {
        subscriber_id: subscriberId,
        status: 'success',
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    })

    const payments = invoices
      .filter(inv => Number(inv.amount_paid) > 0)
      .map(inv => ({
        id: inv.id,
        billing_month: inv.billing_month,
        billing_year: inv.billing_year,
        total_amount_due: Number(inv.total_amount_due),
        amount_paid: Number(inv.amount_paid),
        is_fully_paid: inv.is_fully_paid,
        payment_method: inv.payment_method || 'cash',
        created_at: inv.created_at.toISOString(),
        updated_at: inv.updated_at.toISOString(),
      }))

    const online = onlinePayments.map(op => ({
      id: op.id,
      amount: Number(op.amount),
      gateway: op.gateway,
      gateway_ref: op.gateway_ref,
      status: op.status,
      created_at: op.created_at.toISOString(),
    }))

    return NextResponse.json({ payments, online_payments: online })
  } catch (err: any) {
    console.error('[payment-history] Error:', err?.message || err)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
