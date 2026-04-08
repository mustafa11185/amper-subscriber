import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const subscriberId = cookieStore.get('subscriber_id')?.value
    if (!subscriberId) {
      return NextResponse.json({ error: 'غير مسجل' }, { status: 401 })
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: {
        id: true, name: true, branch_id: true, tenant_id: true,
        amperage: true, subscription_type: true,
      },
    })
    if (!subscriber) {
      return NextResponse.json({ error: 'مشترك غير موجود' }, { status: 404 })
    }

    const body = await req.json()
    const { requested_amperage, requested_type, notes } = body

    if (!requested_amperage && !requested_type) {
      return NextResponse.json({ error: 'يرجى تحديد التغيير المطلوب' }, { status: 400 })
    }

    // Prevent spam — 1 pending request at a time
    const pending = await prisma.upgradeRequest.findFirst({
      where: {
        subscriber_id: subscriber.id,
        status: 'pending',
      },
    })

    if (pending) {
      return NextResponse.json({
        ok: true,
        message: 'لديك طلب تغيير قيد المراجعة — سيتواصل معك المدير قريباً',
      })
    }

    // Create upgrade request
    await prisma.upgradeRequest.create({
      data: {
        subscriber_id: subscriber.id,
        branch_id: subscriber.branch_id,
        from_type: subscriber.subscription_type,
        to_type: requested_type || subscriber.subscription_type,
        requested_by: 'subscriber',
        status: 'pending',
      },
    })

    // Notification for manager
    const currentAmp = Number(subscriber.amperage)
    const newAmp = requested_amperage || currentAmp
    const typeLabel = requested_type === 'gold' ? 'ذهبي' : requested_type === 'normal' ? 'عادي' : ''

    await prisma.notification.create({
      data: {
        branch_id: subscriber.branch_id,
        tenant_id: subscriber.tenant_id,
        type: 'change_request',
        title: 'طلب تغيير اشتراك',
        body: `${subscriber.name} يطلب تغيير: ${currentAmp}A ${subscriber.subscription_type} → ${newAmp}A ${typeLabel}${notes ? ' — ' + notes : ''}`,
        is_read: false,
        payload: {
          subscriber_id: subscriber.id,
          subscriber_name: subscriber.name,
          current_amperage: currentAmp,
          requested_amperage: newAmp,
          current_type: subscriber.subscription_type,
          requested_type: requested_type || subscriber.subscription_type,
          notes: notes || null,
        },
      },
    })

    return NextResponse.json({ ok: true, message: 'تم إرسال طلبك — سيتواصل معك المدير قريباً' })
  } catch (err: any) {
    console.error('[change-request] Error:', err?.message || err)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
