'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if already logged in (via localStorage — httpOnly cookie not readable from JS)
  useEffect(() => {
    const saved = localStorage.getItem('amper_code')

    // Auto-login via ?code= query param (from printed QR)
    const params = new URLSearchParams(window.location.search)
    const qrCode = params.get('code')
    const codeToUse = qrCode
      ? qrCode.toUpperCase().trim().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '')
      : saved

    if (!codeToUse || codeToUse.length < 6) return

    setLoading(true)
    fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeToUse }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          localStorage.setItem('amper_code', codeToUse)
          router.replace('/home')
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [router])

  function cleanCode(raw: string): string {
    return raw.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '')
  }

  function handleChange(raw: string) {
    setCode(cleanCode(raw))
    setError('')
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    setCode(cleanCode(pasted))
    setError('')
  }

  async function handleSubmit() {
    const c = cleanCode(code)
    if (c.length < 10) { setError('ادخل الكود كاملاً'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem('amper_code', c)
        router.push('/home')
      } else {
        setError(data.error || 'الكود غير صحيح')
        setCode('')
        inputRef.current?.focus()
      }
    } catch (err: any) {
      setError(`خطأ في الاتصال${err?.message ? ': ' + err.message : ''}`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FFFFFF' }}>
      {/* Top gradient section */}
      <div style={{
        background: 'linear-gradient(135deg, #1B4FD8, #2563EB)',
        padding: '60px 24px 48px',
        textAlign: 'center',
        color: 'white',
        borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="56" height="56" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <polygon points="24,3 40,3 48,19 40,35 24,35 16,19" fill="#0E2A50" stroke="#1A56A0" strokeWidth="1.5"/>
            <polygon points="24,7 38,7 45,19 38,31 24,31 17,19" fill="none" stroke="#1A3A6B" strokeWidth="0.5"/>
            <circle cx="24" cy="3" r="2" fill="#2563EB" opacity="0.6"/>
            <circle cx="40" cy="3" r="2" fill="#2563EB" opacity="0.6"/>
            <circle cx="48" cy="19" r="2" fill="#2563EB" opacity="0.6"/>
            <polygon points="30,7 21,19 27,19 18,33 38,17 30,17" fill="#F59E0B"/>
            <polygon points="30,7 29,9 32,17 38,17" fill="#FCD34D" opacity="0.45"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>أمبير</h1>
        <p className="text-sm mt-2" style={{ opacity: 0.7 }}>نظام إدارة المولدات الذكي</p>
      </div>

      {/* Bottom white section with form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[340px] space-y-6 text-center">
          <p className="text-base font-bold" style={{ color: '#0F172A' }}>ادخل كودك</p>

          {/* Code input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={code}
            onChange={e => handleChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="BG-05-001-482"
            dir="ltr"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full text-center font-mono font-bold outline-none tracking-wider"
            style={{
              height: 56,
              fontSize: 22,
              background: '#F8F9FF',
              border: code ? '1.5px solid #1B4FD8' : '1.5px solid rgba(0,0,0,0.06)',
              borderRadius: 14,
              color: '#0F172A',
              caretColor: '#1B4FD8',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
            }}
          />

          {error && <p className="text-xs font-bold" style={{ color: '#C62828' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || cleanCode(code).length < 10}
            className="w-full h-14 text-white text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#1B4FD8', borderRadius: 14 }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <p className="text-xs" style={{ color: '#8E8E93' }}>الكود موجود في رسالة واتساب من مولدتك</p>
          <p className="text-[10px]" style={{ color: '#94A3B8' }}>مدعوم من أمبير ⚡</p>
        </div>
      </div>
    </div>
  )
}
