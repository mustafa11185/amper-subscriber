'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Check if already logged in
  useEffect(() => {
    const sid = document.cookie.split(';').find(c => c.trim().startsWith('subscriber_id='))
    if (sid) router.replace('/home')
  }, [router])

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    setError('')

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newDigits.every(d => d)) {
      handleSubmit(newDigits.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      handleSubmit(pasted)
    }
  }

  async function handleSubmit(code?: string) {
    const c = code || digits.join('')
    if (c.length !== 6) { setError('ادخل الكود كاملاً — 6 أرقام'); return }
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
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
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

        {/* 6-digit input */}
        <div className="flex justify-center gap-2" dir="ltr" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-12 h-14 rounded-xl text-center text-2xl font-num font-bold outline-none transition-all"
              style={{
                background: '#1E293B',
                border: d ? '2px solid #1B4FD8' : '2px solid #334155',
                color: '#E2E8F0',
                caretColor: '#1B4FD8',
              }}
            />
          ))}
        </div>

        {error && <p className="text-xs font-bold" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          onClick={() => handleSubmit()}
          disabled={loading || digits.some(d => !d)}
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
