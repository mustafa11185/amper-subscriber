'use client'

import Link from 'next/link'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg-base, #0D1117)', color: 'var(--text, #E2E8F0)' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(5,150,105,0.15)' }}>
        <span className="text-4xl">✅</span>
      </div>
      <h1 className="text-xl font-bold mb-2">تم الدفع بنجاح</h1>
      <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>شكراً لك — تم تسجيل الدفعة الإلكترونية</p>
      <Link href="/home"
        className="h-11 px-6 rounded-xl text-white text-sm font-bold flex items-center justify-center"
        style={{ background: '#1B4FD8' }}>
        العودة لصفحتك
      </Link>
    </div>
  )
}
