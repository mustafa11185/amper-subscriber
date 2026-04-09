'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, CreditCard, Phone, AlertTriangle, CheckCircle2,
  Clock, Loader2, FileText, PhoneCall, LogOut, Bell,
  Star, Send, ChevronDown, History, ArrowLeft,
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

type Tab = 'home' | 'pay' | 'history' | 'alerts' | 'contact'

export default function SubscriberHomePage() {
  const router = useRouter()
  const [data, setData] = useState<SubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('home')
  const [callingCollector, setCallingCollector] = useState(false)
  const [payingCard, setPayingCard] = useState(false)
  const [payMethod, setPayMethod] = useState<'qi_card'|'visa'|'zaincash'|null>(null)
  const [showCardSheet, setShowCardSheet] = useState(false)
  const [showZainSheet, setShowZainSheet] = useState(false)
  const [cardNum, setCardNum] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [zainData, setZainData] = useState<{ merchant_phone: string | null; amount: number } | null>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchMe = () => fetch('/api/subscriber/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { router.replace('/'); })
    const fetchAnnouncements = () => fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements ?? [])).catch(() => {})
    const fetchUnread = () => fetch('/api/announcements/unread-count').then(r => r.json()).then(d => setUnreadCount(d.count ?? 0)).catch(() => {})

    fetchMe()
    fetchAnnouncements()
    fetchUnread()

    // Refresh when tab becomes visible
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchMe()
        fetchAnnouncements()
        fetchUnread()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    // Poll notifications every 5 minutes
    const interval = setInterval(() => {
      fetchUnread()
      fetchAnnouncements()
    }, 5 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [router])

  const onTabClick = (key: Tab) => {
    setTab(key)
    if (key === 'alerts' && unreadCount > 0) {
      setUnreadCount(0)
      const ids = announcements.map((a: any) => a.id)
      if (ids.length) {
        fetch('/api/announcements/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_ids: ids }),
        }).catch(() => {})
      }
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-dvh" style={{ background: '#F0F4FF' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1B4FD8' }} />
      </div>
    )
  }

  const brandColor = data.settings.primary_color || '#1B4FD8'
  const inv = data.current_invoice
  const invoiceDue = inv ? inv.total_amount_due - inv.amount_paid : 0
  const hasPayment = data.settings.furatpay_enabled || data.settings.active_gateway === 'aps'

  const formatCardNum = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 2) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }
  const invMonthName = inv ? formatBillingMonth(inv.billing_month, inv.billing_year) : ''
  const totalDue = invoiceDue + (data?.total_debt ?? 0)

  async function handleCardPay() {
    if (!cardNum || !cardExpiry || !cardCvv) return
    setPayLoading(true)
    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: data?.current_invoice?.id,
          amount: totalDue,
          payment_method: payMethod,
        }),
      })
      const result = await res.json()
      if (result.payment_url) {
        window.location.href = result.payment_url
      } else {
        toast.error(result.error || 'فشل إنشاء رابط الدفع')
        setPayLoading(false)
      }
    } catch {
      toast.error('خطأ في الاتصال')
      setPayLoading(false)
    }
  }

  async function handleZainPay() {
    setPayLoading(true)
    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: data?.current_invoice?.id,
          amount: totalDue,
          payment_method: 'zaincash',
        }),
      })
      const result = await res.json()
      if (result.zaincash) {
        setZainData({ merchant_phone: result.merchant_phone, amount: result.amount })
        setShowZainSheet(true)
      } else {
        toast.error(result.error || 'فشل')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    }
    setPayLoading(false)
  }

  function logout() {
    document.cookie = 'subscriber_id=; path=/; max-age=0'
    localStorage.removeItem('amper_code')
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
    { key: 'alerts', icon: Bell, label: 'إشعارات' },
    { key: 'contact', icon: Phone, label: 'تواصل' },
  ]

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex-1 pb-20" style={{ background: '#F0F4FF', color: '#0F172A' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1B4FD8, #2563EB)',
          padding: '20px 16px 24px',
          color: 'white',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, padding: '8px 12px', color: 'white', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{data.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{data.branch_name}</div>
            </div>
            <div style={{ width: 42 }} />
          </div>
        </div>

        <div className="px-4 space-y-4">
          {tab === 'home' && (
            <>
              {/* Feature 6: Unpaid invoice banner */}
              {inv && !inv.is_fully_paid && (
                <div
                  className="rounded-xl p-4 flex items-center justify-between animate-fade-in"
                  style={{ background: '#FEF2F2', borderRight: '3px solid #C62828', boxShadow: 'none' }}
                >
                  <button
                    onClick={() => setTab('pay')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                    style={{ background: '#1B4FD8', color: '#FFF' }}
                  >
                    ادفع الآن
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <div className="text-right">
                    <p className="text-xs font-bold flex items-center justify-end gap-1" style={{ color: '#C62828' }}>
                      <span>فاتورة {invMonthName} غير مدفوعة</span>
                    </p>
                    <p className="font-num text-lg font-bold mt-0.5" style={{ color: '#0F172A' }}>
                      {fmt(invoiceDue)} <span className="text-[10px]" style={{ color: '#94A3B8' }}>د.ع</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Generator status */}
              {data.generator_status && (
                <div className="py-3 px-1 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(data.generator_status.gold_hours_today != null || data.generator_status.normal_hours_today != null) && (
                      <>
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{data.generator_status.gold_hours_today ?? 0}h ذهبي</span>
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{data.generator_status.normal_hours_today ?? 0}h عادي</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#8E8E93' }}>{data.generator_status.name}</span>
                    <span className="text-[10px]" style={{ color: data.generator_status.run_status ? '#2E7D32' : '#C62828' }}>{data.generator_status.run_status ? 'تعمل' : 'متوقفة'}</span>
                    <div className={`w-2 h-2 rounded-full ${data.generator_status.run_status ? 'pulse-green' : 'pulse-dot-red'}`} style={{ background: data.generator_status.run_status ? '#2E7D32' : '#C62828' }} />
                  </div>
                </div>
              )}

              {/* Invoice amount */}
              <div className="text-center" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', padding: '24px 16px', borderRadius: 16 }}>
                <p className="text-sm mb-3" style={{ color: '#8E8E93' }}>المبلغ المستحق</p>
                <p className="font-num text-4xl font-black" style={{ color: '#0F172A' }}>{fmt(invoiceDue)}<span className="text-sm mr-1 font-normal" style={{ color: '#8E8E93' }}>د.ع</span></p>
                <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>دينار عراقي</p>
                {inv && (
                  <p className="text-xs mt-2" style={{ color: '#8E8E93' }}>
                    {formatBillingMonth(inv.billing_month, inv.billing_year)} — {data.amperage} أمبير
                  </p>
                )}
                {inv?.is_fully_paid && <p className="text-xs mt-2" style={{ color: '#16A34A' }}>مدفوعة بالكامل</p>}
                {inv && !inv.is_fully_paid && hasPayment && (
                  <button
                    onClick={() => setTab('pay')}
                    className="w-full text-white text-sm font-bold mt-6"
                    style={{ background: '#1B4FD8', height: 52, borderRadius: 14 }}
                  >
                    ادفع الآن
                  </button>
                )}
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

              {/* Feature 7: Payment history link */}
              <button
                onClick={() => router.push('/history')}
                className="w-full rounded-2xl p-4 flex items-center justify-between"
                style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}
              >
                <ArrowLeft className="w-4 h-4" style={{ color: '#94A3B8' }} />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold text-right" style={{ color: '#0F172A' }}>سجل الدفعات</p>
                    <p className="text-[10px] text-right" style={{ color: '#94A3B8' }}>عرض جميع الدفعات السابقة</p>
                  </div>
                  <History className="w-5 h-5" style={{ color: '#1B4FD8' }} />
                </div>
              </button>

              {/* Feature 10: Change subscription request */}
              <ChangeRequestCard
                amperage={data.amperage}
                subscriptionType={data.subscription_type}
              />

              {/* Feature 8: Service rating */}
              <RatingCard subscriberId={data.id} />
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
                      className="w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: '#1B4FD8' }}>
                      {callingCollector ? 'جاري...' : '📞 أرسل الجابي'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Amount card */}
                  <div className="overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B4FD8, #2563EB)', borderRadius: 16 }}>
                    <div className="p-5 text-center">
                      <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>المبلغ المستحق</p>
                      <p className="font-num text-4xl font-bold" style={{ color: '#FFFFFF' }}>{fmt(totalDue)}<span className="text-sm mr-1" style={{ color: 'rgba(255,255,255,0.5)' }}>د.ع</span></p>
                    </div>
                    <div className="flex" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="flex-1 p-3 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>فاتورة {invMonthName}</p>
                        <p className="font-bold font-num text-sm" style={{ color: '#FFFFFF' }}>{fmt(invoiceDue)}</p>
                      </div>
                      <div className="flex-1 p-3 text-center">
                        <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>ديون سابقة</p>
                        <p className={`font-bold font-num text-sm`} style={{ color: data.total_debt > 0 ? '#FCA5A5' : '#FFFFFF' }}>{fmt(data.total_debt)}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>اختر طريقة الدفع</p>

                  {/* Qi Card / Mastercard */}
                  <button onClick={() => { setPayMethod('qi_card'); setShowCardSheet(true) }}
                    className="w-full rounded-xl p-3 flex items-center justify-between"
                    style={{ background: '#FFFFFF', border: '1.5px solid rgba(0,0,0,0.08)' }}>
                    <span style={{ color: '#0F172A' }}>&#x203A;</span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>كي كارد / ماستركارد</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>بطاقة كي العراقية أو ماستركارد</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: '#009944' }}>QI</span>
                        <svg width="24" height="16" viewBox="0 0 32 20"><circle cx="12" cy="10" r="9" fill="#EB001B" /><circle cx="20" cy="10" r="9" fill="#F79E1B" /><path d="M16 3.3a9 9 0 0 1 0 13.4 9 9 0 0 1 0-13.4z" fill="#FF5F00" /></svg>
                      </div>
                    </div>
                  </button>

                  {/* Visa */}
                  <button onClick={() => { setPayMethod('visa'); setShowCardSheet(true) }}
                    className="w-full rounded-xl p-3 flex items-center justify-between"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>&#x203A;</span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>فيزا كارد</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>بطاقة فيزا بنكية</p>
                      </div>
                      <div className="rounded px-2 py-1" style={{ background: '#1A1F71' }}>
                        <span className="text-white text-sm font-black italic">VISA</span>
                      </div>
                    </div>
                  </button>

                  {/* ZainCash */}
                  <button onClick={() => { setPayMethod('zaincash'); handleZainPay() }}
                    className="w-full rounded-xl p-3 flex items-center justify-between"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>&#x203A;</span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ZainCash</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>محفظة زين النقدية</p>
                      </div>
                      <div className="rounded px-2 py-1" style={{ background: '#009944' }}>
                        <span className="text-white text-sm font-black">Z</span>
                      </div>
                    </div>
                  </button>

                  <p className="text-center text-[10px]" style={{ color: '#94A3B8' }}>🔒 دفع آمن ومشفّر</p>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">سجل الفواتير</h2>
              {data.invoices_history.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: '#94A3B8' }}>لا توجد فواتير</p>
              ) : data.invoices_history.map((inv, i) => (
                <div key={inv.id} className="py-3 flex items-center justify-between" style={{ borderBottom: i < data.invoices_history.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-num text-lg font-bold" style={{ color: '#0F172A' }}>{fmt(inv.total_amount_due)}</span>
                    <span className="text-[10px]" style={{ color: '#94A3B8' }}>د.ع</span>
                    {inv.is_fully_paid ? (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />
                    ) : (
                      <Clock className="w-3.5 h-3.5" style={{ color: '#C62828' }} />
                    )}
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{formatBillingMonth(inv.billing_month, inv.billing_year)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'alerts' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">الإشعارات</h2>
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: '#F1F5F9' }}>📭</div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد إشعارات</p>
                </div>
              ) : announcements.map((a: any) => {
                const cfg: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
                  maintenance: { emoji: '🔧', label: 'صيانة', bg: '#FFF3E0', color: '#E65100' },
                  emergency: { emoji: '⚡', label: 'طارئ', bg: '#FFEBEE', color: '#C62828' },
                  price: { emoji: '💰', label: 'تسعيرة', bg: '#E8F5E9', color: '#2E7D32' },
                  general: { emoji: '📢', label: 'إعلان', bg: '#E3F2FD', color: '#1565C0' },
                }
                const c = cfg[a.type] ?? cfg.general
                const dt = new Date(a.created_at)
                const diff = Date.now() - dt.getTime()
                const mins = Math.floor(diff / 60000)
                const timeAgo = mins < 60 ? `منذ ${mins} دقيقة` : mins < 1440 ? `منذ ${Math.floor(mins / 60)} ساعة` : `منذ ${Math.floor(mins / 1440)} يوم`
                return (
                  <div key={a.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: `1px solid ${c.bg}`, boxShadow: 'var(--shadow-card)' }}>
                    {a.is_urgent && <div className="text-white text-xs font-bold text-center py-1.5" style={{ background: '#EF4444' }}>🚨 إشعار عاجل</div>}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px]" style={{ color: c.color }}>{timeAgo}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{c.emoji} {c.label}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-right" style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'contact' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">تواصل</h2>
              {data.settings.collector_call_enabled && (
                <button onClick={handleCallCollector} disabled={callingCollector}
                  className="w-full h-14 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#1B4FD8' }}>
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

        {/* Card payment bottom sheet */}
        {showCardSheet && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 max-w-[390px] mx-auto">
              <div className="w-9 h-1 rounded mx-auto mb-4" style={{ background: '#E2E8F0' }} />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {payMethod === 'qi_card' ? (<>
                    <span className="text-white text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: '#009944' }}>QI</span>
                    <svg width="24" height="16" viewBox="0 0 32 20"><circle cx="12" cy="10" r="9" fill="#EB001B" /><circle cx="20" cy="10" r="9" fill="#F79E1B" /><path d="M16 3.3a9 9 0 0 1 0 13.4 9 9 0 0 1 0-13.4z" fill="#FF5F00" /></svg>
                  </>) : (
                    <div className="rounded px-2 py-1" style={{ background: '#1A1F71' }}><span className="text-white text-sm font-black italic">VISA</span></div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-right" style={{ color: 'var(--text-primary)' }}>
                    {payMethod === 'qi_card' ? 'كي كارد / ماستركارد' : 'فيزا كارد'}
                  </p>
                  <p className="text-lg font-bold font-num text-right" style={{ color: brandColor }}>{fmt(totalDue)} د.ع</p>
                </div>
              </div>
              <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>رقم البطاقة</label>
              <input type="tel" inputMode="numeric" maxLength={19} value={cardNum}
                onChange={e => setCardNum(formatCardNum(e.target.value))}
                placeholder="0000 0000 0000 0000" dir="ltr"
                className="w-full rounded-xl px-3 py-3 text-center text-sm tracking-widest mb-3 outline-none"
                style={{ background: '#F8FAFC', border: '1px solid var(--border)' }} />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>تاريخ الانتهاء</label>
                  <input type="tel" inputMode="numeric" maxLength={5} value={cardExpiry}
                    onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY" dir="ltr"
                    className="w-full rounded-xl px-3 py-3 text-center text-sm outline-none"
                    style={{ background: '#F8FAFC', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>رمز CVV</label>
                  <input type="tel" inputMode="numeric" maxLength={3} value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="•••" dir="ltr"
                    className="w-full rounded-xl px-3 py-3 text-center text-sm outline-none"
                    style={{ background: '#F8FAFC', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>اسم حامل البطاقة</label>
              <input type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                placeholder="الاسم كما هو على البطاقة"
                className="w-full rounded-xl px-3 py-3 text-right text-sm mb-4 outline-none"
                style={{ background: '#F8FAFC', border: '1px solid var(--border)' }} />
              <button onClick={handleCardPay} disabled={payLoading || !cardNum || !cardExpiry || !cardCvv}
                className="w-full py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: payLoading ? '#94A3B8' : '#1B4FD8' }}>
                {payLoading ? '⏳ جارٍ الدفع...' : `ادفع الآن ${fmt(totalDue)} د.ع`}
              </button>
              <p className="text-center text-[10px] mt-2" style={{ color: '#94A3B8' }}>🔒 مشفّر بـ SSL 256-bit</p>
              <button onClick={() => { setShowCardSheet(false); setCardNum(''); setCardExpiry(''); setCardCvv(''); setCardName('') }}
                className="w-full mt-2 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>إلغاء</button>
            </div>
          </div>
        )}

        {/* ZainCash bottom sheet */}
        {showZainSheet && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 max-w-[390px] mx-auto">
              <div className="w-9 h-1 rounded mx-auto mb-4" style={{ background: '#E2E8F0' }} />
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowZainSheet(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ZainCash</p>
                  <p className="text-lg font-bold font-num" style={{ color: '#009944' }}>{fmt(totalDue)} د.ع</p>
                </div>
              </div>
              <div className="rounded-2xl p-4 text-center mb-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div className="w-20 h-20 bg-white rounded-xl mx-auto mb-2 flex items-center justify-center text-4xl" style={{ border: '2px solid #4ADE80' }}>▦</div>
                <p className="font-bold text-sm" style={{ color: '#15803D' }}>امسح الباركود بتطبيق ZainCash</p>
                <p className="text-[11px] mt-1" style={{ color: '#4ADE80' }}>صالح لمدة 15 دقيقة</p>
              </div>
              <p className="text-[11px] text-center mb-3" style={{ color: 'var(--text-muted)' }}>أو اتبع هذه الخطوات</p>
              <div className="rounded-2xl mb-4" style={{ border: '1px solid var(--border)' }}>
                {['افتح تطبيق ZainCash أو SuperQi', 'اختر "دفع فاتورة" أو "Scan to Pay"', 'امسح الباركود أعلاه', 'أدخل رقمك السري وأكد الدفع'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: '#009944' }}>{i + 1}</div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step}</span>
                  </div>
                ))}
              </div>
              {zainData?.merchant_phone && (
                <div className="rounded-2xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>رقم محفظة ZainCash</p>
                  <p className="font-bold text-lg tracking-widest" style={{ color: '#009944' }}>{zainData.merchant_phone}</p>
                  <button onClick={() => { navigator.clipboard.writeText(zainData.merchant_phone!); toast.success('تم نسخ الرقم') }}
                    className="text-[11px] mt-1" style={{ color: '#0F172A' }}>📋 نسخ الرقم</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="max-w-[390px] mx-auto flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
            {tabs.map(t => {
              const isActive = tab === t.key
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => onTabClick(t.key)} className="flex flex-col items-center gap-1 py-2 px-3">
                  <span className="relative inline-block">
                    <Icon className="w-5 h-5" style={{ color: isActive ? '#1B4FD8' : '#8E8E93' }} />
                    {t.key === 'alerts' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-white font-bold" style={{ background: '#C62828', minWidth: '16px', height: '16px', fontSize: '9px', padding: '0 4px' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px]" style={{ color: isActive ? '#1B4FD8' : '#8E8E93', fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
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
    <div className="rounded-xl p-4" style={{ background: '#FFFBEB', borderRight: '3px solid #FF9500' }}>
      <div className="flex items-start justify-between mb-2">
        <button onClick={() => setShow(false)} className="text-xs" style={{ color: '#94A3B8' }}>✕</button>
        <span className="text-base">⭐</span>
      </div>
      <p className="text-sm font-bold mb-1 text-right" style={{ color: '#0F172A' }}>هل تعلم؟</p>
      <p className="text-xs leading-relaxed text-right" style={{ color: '#8E8E93' }}>مشتركو الذهبي يحصلون على ساعات أكثر — تحدث مع صاحب المولدة للترقية</p>
    </div>
  )
}

function RatingCard({ subscriberId }: { subscriberId: string }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const key = `amper_rated_${new Date().getFullYear()}_${new Date().getMonth()}`
    if (localStorage.getItem(key)) setSubmitted(true)
  }, [])

  async function handleSubmit() {
    if (rating === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/subscriber/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSubmitted(true)
        const key = `amper_rated_${new Date().getFullYear()}_${new Date().getMonth()}`
        localStorage.setItem(key, 'true')
        toast.success('شكراً لتقييمك!')
      } else {
        toast.error(data.error || 'فشل إرسال التقييم')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-2xl mb-2">⭐</p>
        <p className="text-sm font-bold" style={{ color: '#2E7D32' }}>شكراً لتقييمك!</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>يساعدنا تقييمك على تحسين الخدمة</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-5 h-5" style={{ color: '#FF9500' }} />
        <p className="text-sm font-bold">قيّم الخدمة</p>
      </div>

      {/* Stars */}
      <div className="flex items-center justify-center gap-2 mb-3" dir="ltr">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform"
            style={{ transform: (hovered >= n || rating >= n) ? 'scale(1.15)' : 'scale(1)' }}
          >
            <Star
              className="w-8 h-8"
              fill={(hovered >= n || rating >= n) ? '#F59E0B' : 'none'}
              style={{ color: (hovered >= n || rating >= n) ? '#F59E0B' : '#CBD5E1' }}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      <div className="mb-3">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="ملاحظة (اختياري) 💬"
          rows={2}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
          style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: rating > 0 ? '#1B4FD8' : '#94A3B8' }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
      </button>
    </div>
  )
}

function ChangeRequestCard({ amperage, subscriptionType }: { amperage: number; subscriptionType: string }) {
  const [expanded, setExpanded] = useState(false)
  const [reqAmperage, setReqAmperage] = useState(String(amperage))
  const [reqType, setReqType] = useState(subscriptionType)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const amperageOptions = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50]
  const typeLabel = (t: string) => t === 'gold' ? 'ذهبي' : 'عادي'

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/subscriber/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_amperage: Number(reqAmperage),
          requested_type: reqType,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSubmitted(true)
        toast.success(data.message || 'تم إرسال طلبك')
      } else {
        toast.error(data.error || 'فشل إرسال الطلب')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-2xl mb-2">⚡</p>
        <p className="text-sm font-bold" style={{ color: '#2E7D32' }}>تم إرسال طلبك</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>سيتواصل معك المدير قريباً</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold">طلب تغيير الاشتراك</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              الحالي: {amperage} أمبير — {typeLabel(subscriptionType)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)' }}>
            <Zap className="w-5 h-5" style={{ color: '#7C3AED' }} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-3">
            <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>الأمبير الجديد</label>
            <select
              value={reqAmperage}
              onChange={e => setReqAmperage(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
              style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {amperageOptions.map(a => (
                <option key={a} value={a}>{a} أمبير{a === amperage ? ' (الحالي)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>نوع الاشتراك</label>
            <select
              value={reqType}
              onChange={e => setReqType(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
              style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="normal">عادي{subscriptionType === 'normal' ? ' (الحالي)' : ''}</option>
              <option value="gold">ذهبي{subscriptionType === 'gold' ? ' (الحالي)' : ''}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] block text-right mb-1" style={{ color: 'var(--text-muted)' }}>ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || (Number(reqAmperage) === amperage && reqType === subscriptionType)}
            className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#1B4FD8' }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      )}
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
            اضغط <span style={{ color: '#0F172A' }}>مشاركة ↗</span> ثم <span style={{ color: '#0F172A' }}>إضافة للشاشة الرئيسية</span>
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
