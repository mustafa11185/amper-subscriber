import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || code.trim().length < 3) {
      return NextResponse.json({ error: "الكود غير صحيح" }, { status: 400 });
    }

    // Normalize: uppercase, strip spaces and non-alphanumeric (except hyphens)
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');

    // Build hyphenated version if entered without hyphens (e.g. "BG05001482" → "BG-05-001-482")
    const withHyphens = normalized.includes('-')
      ? normalized
      : normalized.replace(/^([A-Z]{2})(\d{2})(\d{3})(\d{3})$/, '$1-$2-$3-$4');

    console.log('[lookup] Searching for code:', withHyphens, '| DB URL exists:', !!process.env.DATABASE_URL);

    // Try exact match with hyphenated code
    let subscriber = await prisma.subscriber.findFirst({
      where: { access_code: withHyphens, is_active: true },
      include: { branch: { select: { name: true } } },
    });

    // Fallback: try the raw normalized input (handles edge cases)
    if (!subscriber && withHyphens !== normalized) {
      subscriber = await prisma.subscriber.findFirst({
        where: { access_code: normalized, is_active: true },
        include: { branch: { select: { name: true } } },
      });
    }

    if (!subscriber) {
      return NextResponse.json({ error: "الكود غير صحيح" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("subscriber_id", subscriber.id, {
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return NextResponse.json({
      ok: true,
      subscriber_id: subscriber.id,
      name: subscriber.name,
      branch_name: subscriber.branch.name,
    });
  } catch (error: any) {
    console.error('[lookup] Error:', error?.message || error);
    console.error('[lookup] Stack:', error?.stack);
    console.error('[lookup] DB URL exists:', !!process.env.DATABASE_URL);

    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDev ? `خطأ: ${error?.message}` : "خطأ في الخادم — حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
