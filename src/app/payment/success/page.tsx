'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = params.get('ref') ?? ''
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); router.push('/home'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh',
      background: '#F0F4FF',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: '40px 24px',
        textAlign: 'center', maxWidth: 360, width: '100%',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#2E7D32',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: 'white', fontSize: 32, fontWeight: 700,
        }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>تم الدفع بنجاح!</h2>
        <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>تم تسجيل دفعتك بنجاح</p>
        {ref && (
          <div style={{ background: '#F8F9FF', borderRadius: 12, padding: 10, marginBottom: 20 }}>
            <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>رقم المعاملة</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{ref}</p>
          </div>
        )}
        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#2E7D32' }}>العودة خلال {countdown} ثوانٍ...</p>
        </div>
        <button onClick={() => router.push('/home')} style={{
          width: '100%', padding: 14, borderRadius: 14,
          background: '#1B4FD8',
          color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>العودة الآن</button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return <Suspense><SuccessContent /></Suspense>
}
