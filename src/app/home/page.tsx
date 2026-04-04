'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, CreditCard, Phone, AlertTriangle, CheckCircle2,
  Clock, Loader2, FileText, PhoneCall, LogOut,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const fmt = (n: number) => Number(n).toLocaleString('en')
import { formatBillingMonth, monthName } from '@/lib/billing-months'

type SubData = {
  id: string; name: string; serial_number: string; subscription_type: string
  amperage: number; total_debt: number; branch_name: string; price_per_amp: number | null
  current_invoice: { id: string; billing_month: number; billing_year: number; total_amount_due: number; amount_paid: number; is_fully_paid: boolean } | null
  invoices_history: { id: string; billing_month: number; billing_year: number; total_amount_due: number; amount_paid: number; is_fully_paid: boolean }[]
  generator_status: { name: string; run_status: boolean; last_seen: string | null; is_online: boolean; gold_hours_today?: number; normal_hours_today?: number } | null
  settings: { primary_color: string; welcome_message: string | null; active_gateway: string; collector_call_enabled: boolean; furatpay_enabled: boolean }
}

type Tab = 'home' | 'pay' | 'history' | 'contact'

export default function SubscriberHomePage() {
  const router = useRouter()
  const [data, setData] = useState<SubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('home')
  const [callingCollector, setCallingCollector] = useState(false)
  const [payingCard, setPayingCard] = useState(false)

  useEffect(() => {
    fetch('/api/subscriber/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { router.replace('/'); })
  }, [router])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-dvh" style={{ background: 'var(--bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1B4FD8' }} />
      </div>
    )
  }

  const brandColor = data.settings.primary_color || '#1B4FD8'
  const inv = data.current_invoice
  const invoiceDue = inv ? inv.total_amount_due - inv.amount_paid : 0
  const hasPayment = data.settings.furatpay_enabled || data.settings.active_gateway === 'aps'

  function logout() {
    document.cookie = 'subscriber_id=; path=/; max-age=0'
    router.replace('/')
  }

  async function handleCallCollector() {
    setCallingCollector(true)
    try {
      const res = await fetch('/api/collector-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const result = await res.json()
      if (res.ok && result.ok) {
        toast.success(result.message || 'تم إرسال الطلب — سيتواصل معك الجابي')
      } else {
        toast.error(result.error || 'فشل إرسال الطلب')
      }
    } catch { toast.error('خطأ في الاتصال — حاول مرة أخرى') }
    setCallingCollector(false)
  }

  async function handlePayCard() {
    setPayingCard(true)
    try {
      const totalAmount = invoiceDue + (data?.total_debt ?? 0)
      const invoiceId = inv?.id || null
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, amount: totalAmount }),
      })
      const result = await res.json()
      if (result.payment_url) { window.location.href = result.payment_url }
      else { toast.error(result.error || 'فشل إنشاء رابط الدفع'); setPayingCard(false) }
    } catch { toast.error('خطأ في الاتصال'); setPayingCard(false) }
  }

  const tabs: { key: Tab; icon: any; label: string }[] = [
    { key: 'home', icon: Zap, label: 'الرئيسية' },
    { key: 'pay', icon: CreditCard, label: 'الدفع' },
    { key: 'history', icon: FileText, label: 'الفواتير' },
    { key: 'contact', icon: Phone, label: 'تواصل' },
  ]

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex-1 pb-20" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">{data.name}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.branch_name}</p>
          </div>
          <button onClick={logout} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
            <LogOut className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="px-4 space-y-4">
          {tab === 'home' && (
            <>
              {/* Generator status */}
              {data.generator_status && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: data.generator_status.run_status ? '#22C55E' : '#EF4444' }} />
                    <span className="text-xs">{data.generator_status.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.generator_status.run_status ? 'تعمل' : 'متوقفة'}</span>
                  </div>
                  {(data.generator_status.gold_hours_today != null || data.generator_status.normal_hours_today != null) && (
                    <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" style={{ color: '#D97706' }} />
                        <span className="text-[10px]" style={{ color: '#D97706' }}>{data.generator_status.gold_hours_today ?? 0}h ذهبي</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.generator_status.normal_hours_today ?? 0}h عادي</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice card */}
              <div className="rounded-2xl p-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}>
                <p className="text-xs opacity-80 mb-1">{inv ? `فاتورة ${formatBillingMonth(inv.billing_month, inv.billing_year)}` : 'لا توجد فاتورة'}</p>
                <p className="font-num text-3xl font-bold">{fmt(invoiceDue)}<span className="text-sm mr-1 opacity-60">د.ع</span></p>
                {inv?.is_fully_paid && <p className="text-xs mt-1 opacity-80">✅ مدفوعة</p>}
              </div>

              {/* Upsell for normal subscribers */}
              {inv?.is_fully_paid && data.subscription_type === 'normal' && (
                <UpsellCard />
              )}

              {/* Debt */}
              {data.total_debt > 0 && (
                <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
                    <span className="text-xs">ديون سابقة</span>
                  </div>
                  <span className="font-num text-sm font-bold" style={{ color: '#EF4444' }}>{fmt(data.total_debt)} د.ع</span>
                </div>
              )}
            </>
          )}

          {tab === 'pay' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">الدفع</h2>
              {!hasPayment ? (
                <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.08)' }}>
                    <CreditCard className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-sm font-bold mb-1">الدفع متاح عند الجابي فقط</p>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>تواصل مع صاحب المولدة لتفعيل الدفع الإلكتروني</p>
                  {data.settings.collector_call_enabled && (
                    <button onClick={handleCallCollector} disabled={callingCollector}
                      className="w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: brandColor }}>
                      {callingCollector ? 'جاري...' : '📞 أرسل الجابي'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Invoice breakdown */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
                    <div className="p-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}DD)` }}>
                      <p className="text-xs opacity-80 mb-1">المبلغ المستحق</p>
                      <p className="font-num text-3xl font-bold">{fmt(invoiceDue + data.total_debt)}<span className="text-sm mr-1 opacity-60">د.ع</span></p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {inv && invoiceDue > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-num text-xs font-bold">{fmt(invoiceDue)} د.ع</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>فاتورة {formatBillingMonth(inv.billing_month, inv.billing_year)}</span>
                        </div>
                      )}
                      {data.total_debt > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-num text-xs font-bold" style={{ color: '#EF4444' }}>{fmt(data.total_debt)} د.ع</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>ديون سابقة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pay button with Mastercard logo */}
                  <button onClick={handlePayCard} disabled={payingCard || (invoiceDue + data.total_debt) <= 0}
                    className="w-full rounded-2xl text-white font-bold disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #1A1F71, #2B3990)', height: 60, boxShadow: '0 4px 24px rgba(26,31,113,0.35)' }}>
                    {payingCard ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg width="32" height="20" viewBox="0 0 32 20">
                        <circle cx="12" cy="10" r="9" fill="#EB001B" opacity="0.9" />
                        <circle cx="20" cy="10" r="9" fill="#F79E1B" opacity="0.9" />
                        <path d="M16 3.3a9 9 0 0 1 0 13.4 9 9 0 0 1 0-13.4z" fill="#FF5F00" />
                      </svg>
                    )}
                    <span className="text-base">{payingCard ? 'جاري التحويل...' : 'ادفع الآن'}</span>
                  </button>

                  {/* Security note */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M10 5H9V3.5C9 1.57 7.43 0 5.5 0S2 1.57 2 3.5V5H1C.45 5 0 5.45 0 6v7c0 .55.45 1 1 1h9c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1zM5.5 10.5c-.83 0-1.5-.67-1.5-1.5S4.67 7.5 5.5 7.5 7 8.17 7 9s-.67 1.5-1.5 1.5zM7.5 5h-4V3.5C3.5 2.4 4.4 1.5 5.5 1.5S7.5 2.4 7.5 3.5V5z" fill="#94A3B8"/></svg>
                    <span className="text-[10px]" style={{ color: '#94A3B8' }}>دفع آمن ومشفّر بالكامل</span>
                  </div>

                  {/* Also call collector */}
                  {data.settings.collector_call_enabled && (
                    <button onClick={handleCallCollector} disabled={callingCollector}
                      className="w-full h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {callingCollector ? 'جاري...' : '📞 أو أرسل الجابي للدفع نقداً'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">سجل الفواتير</h2>
              {data.invoices_history.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>لا توجد فواتير</p>
              ) : data.invoices_history.map(inv => (
                <div key={inv.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
                  <div>
                    <p className="text-xs font-bold">{formatBillingMonth(inv.billing_month, inv.billing_year)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-num text-xs font-bold">{fmt(inv.total_amount_due)} د.ع</p>
                    <span className="text-[10px]" style={{ color: inv.is_fully_paid ? '#22C55E' : '#EF4444' }}>
                      {inv.is_fully_paid ? '✅ مدفوعة' : '⏳ غير مدفوعة'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'contact' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">تواصل</h2>
              {data.settings.collector_call_enabled && (
                <button onClick={handleCallCollector} disabled={callingCollector}
                  className="w-full h-14 rounded-2xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: brandColor }}>
                  <PhoneCall className="w-5 h-5" />
                  {callingCollector ? 'جاري...' : '📞 اطلب زيارة الجابي'}
                </button>
              )}
              <button onClick={logout}
                className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: '#EF4444' }}>
                <LogOut className="w-4 h-4" /> تسجيل الخروج
              </button>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
          <div className="max-w-[390px] mx-auto flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
            {tabs.map(t => {
              const isActive = tab === t.key
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className="flex flex-col items-center gap-1 py-2 px-3">
                  <Icon className="w-5 h-5" style={{ color: isActive ? brandColor : 'var(--text-muted)' }} />
                  <span className="text-[10px]" style={{ color: isActive ? brandColor : '#64748B', fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* PWA install banner */}
        <InstallBanner />
      </div>
    </>
  )
}

function UpsellCard() {
  const [show, setShow] = useState(true)

  if (!show) return null

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', color: '#FFF' }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-base">⭐</span>
        <button onClick={() => setShow(false)} className="text-xs opacity-70">✕</button>
      </div>
      <p className="text-sm font-bold mb-1">هل تعلم؟</p>
      <p className="text-xs opacity-90 leading-relaxed">مشتركو الذهبي يحصلون على ساعات أكثر — تحدث مع صاحب المولدة للترقية</p>
    </div>
  )
}

function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('pwa_dismissed') === 'true') return
    // iOS detection
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      const standalone = (navigator as any).standalone
      if (!standalone) { setIsIOS(true); setShow(true) }
      return
    }
    // Android/Chrome
    const handler = (e: any) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-[358px] mx-auto">
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: '#0F172A' }}>أضف التطبيق لشاشتك الرئيسية</p>
          <button onClick={() => { setShow(false); localStorage.setItem('pwa_dismissed', 'true') }}
            className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        {isIOS ? (
          <p className="text-[10px] mb-2" style={{ color: '#94A3B8' }}>
            اضغط <span style={{ color: '#1B4FD8' }}>مشاركة ↗</span> ثم <span style={{ color: '#1B4FD8' }}>إضافة للشاشة الرئيسية</span>
          </p>
        ) : (
          <button onClick={async () => {
            if (prompt) { prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === 'accepted') setShow(false) }
          }}
            className="w-full h-9 rounded-xl text-white text-xs font-bold" style={{ background: '#1B4FD8' }}>
            إضافة للشاشة الرئيسية
          </button>
        )}
      </div>
    </div>
  )
}
