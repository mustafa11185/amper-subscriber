import { prisma } from "./prisma";

export async function getSubscriberByToken(token: string) {
  const tokenRecord = await prisma.subscriberPublicToken.findUnique({
    where: { token },
  });
  if (!tokenRecord) return null;

  const subscriber = (await prisma.subscriber.findUnique({
    where: { id: tokenRecord.subscriber_id },
    include: { branch: true },
  })) as any;

  if (!subscriber || !subscriber.is_active) return null;

  const generator = await prisma.generator.findFirst({
    where: { branch_id: subscriber.branch_id, is_active: true },
    include: {
      subscriber_app_settings: true,
      iot_devices: { select: { last_seen: true, is_online: true }, take: 1 },
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: { subscriber_id: subscriber.id },
    orderBy: [{ billing_year: "desc" }, { billing_month: "desc" }],
    take: 12,
  });

  const currentInvoice = invoices[0] ?? null;

  // Today's running hours from NormalCutLog
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let goldHoursToday = 0;
  let normalHoursToday = 0;

  if (generator) {
    const cutLogs = await prisma.normalCutLog.findMany({
      where: { branch_id: subscriber.branch_id, cut_start: { gte: todayStart } },
    });
    const normalCutMin = cutLogs.reduce((acc: number, log: any) => acc + (log.duration_min ?? 0), 0);
    const elapsedHours = (Date.now() - todayStart.getTime()) / (1000 * 60 * 60);
    normalHoursToday = normalCutMin / 60;
    goldHoursToday = Math.max(0, elapsedHours - normalHoursToday);
  }

  // Pricing
  const pricing = await prisma.monthlyPricing.findFirst({
    where: { branch_id: subscriber.branch_id },
    orderBy: { effective_from: "desc" },
  });
  const pricePerAmp =
    subscriber.subscription_type === "gold"
      ? pricing ? Number(pricing.price_per_amp_gold) : null
      : pricing ? Number(pricing.price_per_amp_normal) : null;

  // Last run / currently running info
  let lastRunInfo: { type: "off_last" | "running"; date?: string; duration_hours?: number } | null = null;
  if (generator) {
    if (generator.run_status) {
      // Currently running — find open cut log (cut_end IS NULL)
      const openLog = await prisma.normalCutLog.findFirst({
        where: { branch_id: subscriber.branch_id, cut_end: null },
        orderBy: { cut_start: "desc" },
      });
      if (openLog) {
        const runMin = (Date.now() - new Date(openLog.cut_start).getTime()) / 60000;
        lastRunInfo = { type: "running", duration_hours: Math.round(runMin / 60 * 100) / 100 };
      }
    } else {
      // Off — find latest completed log
      const lastLog = await prisma.normalCutLog.findFirst({
        where: { branch_id: subscriber.branch_id, cut_end: { not: null } },
        orderBy: { cut_end: "desc" },
      });
      if (lastLog) {
        lastRunInfo = {
          type: "off_last",
          date: lastLog.cut_end!.toISOString(),
          duration_hours: (lastLog.duration_min ?? 0) / 60,
        };
      }
    }
  }

  const settings = generator?.subscriber_app_settings ?? null;
  const lastDevice = (generator as any)?.iot_devices?.[0] ?? null;

  return {
    id: subscriber.id,
    name: subscriber.name,
    serial_number: subscriber.serial_number,
    subscription_type: subscriber.subscription_type,
    amperage: Number(subscriber.amperage),
    phone: subscriber.phone,
    total_debt: Number(subscriber.total_debt),
    branch_name: subscriber.branch.name,
    province_key: subscriber.province_key ?? null,
    district_key: subscriber.district_key ?? null,
    token,
    price_per_amp: pricePerAmp,
    current_invoice: currentInvoice
      ? {
          id: currentInvoice.id,
          billing_month: currentInvoice.billing_month,
          billing_year: currentInvoice.billing_year,
          total_amount_due: Number(currentInvoice.total_amount_due),
          amount_paid: Number(currentInvoice.amount_paid),
          is_fully_paid: currentInvoice.is_fully_paid,
        }
      : null,
    invoices_history: invoices.map((inv) => ({
      id: inv.id,
      billing_month: inv.billing_month,
      billing_year: inv.billing_year,
      total_amount_due: Number(inv.total_amount_due),
      amount_paid: Number(inv.amount_paid),
      is_fully_paid: inv.is_fully_paid,
      created_at: inv.created_at.toISOString(),
    })),
    generator_status: generator
      ? {
          name: generator.name,
          run_status: generator.run_status,
          last_seen: lastDevice?.last_seen?.toISOString() ?? null,
          is_online: lastDevice?.is_online ?? false,
          gold_hours_today: Math.round(goldHoursToday * 100) / 100,
          normal_hours_today: Math.round(normalHoursToday * 100) / 100,
          last_run: lastRunInfo,
        }
      : null,
    settings: settings
      ? {
          is_active: (settings as any).is_active,
          primary_color: (settings as any).primary_color || "#1B4FD8",
          logo_url: (settings as any).logo_url,
          welcome_message: (settings as any).welcome_message,
          marketing_message: (settings as any).marketing_message ?? null,
          furatpay_enabled: (settings as any).furatpay_enabled,
          active_gateway: (subscriber.branch as any).active_gateway ?? 'none',
          collector_call_enabled: (settings as any).collector_call_enabled,
          report_target_phone: (settings as any).report_target_phone,
        }
      : {
          is_active: true,
          primary_color: "#1B4FD8",
          logo_url: null,
          welcome_message: null,
          marketing_message: null,
          furatpay_enabled: false,
          active_gateway: 'none',
          collector_call_enabled: true,
          report_target_phone: null,
        },
  };
}

export async function getSubscriberByPhone(phone: string) {
  const subscriber = await prisma.subscriber.findFirst({
    where: { phone, is_active: true },
  });
  if (!subscriber) return null;

  let tokenRecord = await prisma.subscriberPublicToken.findUnique({
    where: { subscriber_id: subscriber.id },
  });
  if (!tokenRecord) {
    tokenRecord = await prisma.subscriberPublicToken.create({
      data: { subscriber_id: subscriber.id },
    });
  }

  return { token: tokenRecord.token, subscriber_id: subscriber.id };
}
