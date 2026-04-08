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
    <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-[340px] space-y-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#1A237E" />
            <text x="16" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">⚡</text>
          </svg>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', fontFamily: 'Rajdhani, sans-serif' }}>أمبير</h1>
        </div>

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
          className="w-full rounded-xl text-center font-mono font-bold outline-none tracking-wider"
          style={{
            height: 56,
            fontSize: 22,
            background: '#F8F9FB',
            border: code ? '1.5px solid #1A237E' : '1.5px solid var(--border)',
            color: '#111827',
            caretColor: '#1A237E',
          }}
        />

        {error && <p className="text-xs font-bold" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || cleanCode(code).length < 10}
          className="w-full h-14 rounded-xl text-white text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#1A237E' }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الكود موجود في رسالة واتساب من مولدتك</p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>مدعوم من أمبير ⚡</p>
      </div>
    </div>
  )
}
