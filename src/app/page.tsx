'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if already logged in
  useEffect(() => {
    const sid = document.cookie.split(';').find(c => c.trim().startsWith('subscriber_id='))
    if (sid) router.replace('/home')
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
        router.push('/home')
      } else {
        setError(data.error || 'الكود غير صحيح')
        setCode('')
        inputRef.current?.focus()
      }
    } catch {
      setError('خطأ في الاتصال')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ background: '#0D1117' }}>
      <div className="w-full max-w-[340px] space-y-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-8 h-8" style={{ color: '#1B4FD8' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0', fontFamily: 'Rajdhani, sans-serif' }}>أمبير</h1>
        </div>

        <p className="text-base font-bold" style={{ color: '#E2E8F0' }}>ادخل كودك</p>

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
          className="w-full rounded-2xl text-center font-mono font-bold outline-none tracking-wider"
          style={{
            height: 56,
            fontSize: 22,
            background: '#1E293B',
            border: code ? '2px solid #1B4FD8' : '2px solid #334155',
            color: '#E2E8F0',
            caretColor: '#1B4FD8',
          }}
        />

        {error && <p className="text-xs font-bold" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || cleanCode(code).length < 10}
          className="w-full h-14 rounded-2xl text-white text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#1B4FD8', boxShadow: '0 4px 20px rgba(27,79,216,0.3)' }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>

        <p className="text-xs" style={{ color: '#475569' }}>الكود موجود في رسالة واتساب من مولدتك</p>
        <p className="text-[10px]" style={{ color: '#334155' }}>مدعوم من أمبير ⚡</p>
      </div>
    </div>
  )
}
