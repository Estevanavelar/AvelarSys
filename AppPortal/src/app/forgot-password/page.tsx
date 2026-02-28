'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function getErrorMessage(data: any): string {
  if (!data) return 'Erro ao processar a solicitação'
  if (typeof data === 'string') return data
  if (data instanceof Error) return data.message || 'Erro desconhecido'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    const msgs = data.detail
      .map((item: any) => (typeof item === 'string' ? item : item?.msg))
      .filter(Boolean)
    return msgs.length > 0 ? msgs.join(' | ') : 'Erro de validação'
  }
  if (typeof data.detail === 'object' && data.detail !== null) {
    return data.detail.message || data.detail.error || JSON.stringify(data.detail)
  }
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  try {
    return JSON.stringify(data)
  } catch {
    return 'Erro desconhecido'
  }
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')

const formatDocument = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

type Step = 'request' | 'code'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const [step, setStep] = useState<Step>('request')
  const [document, setDocument] = useState('')
  const [code, setCode] = useState('')
  const [maskedWhatsapp, setMaskedWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [navLoading, setNavLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    router.prefetch('/forgot-password/new')
    router.prefetch('/login')
  }, [router])

  const handleNav = (path: string) => {
    setNavLoading(path)
    setTimeout(() => {
      router.push(path)
    }, 500)
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (!apiBase) {
        setError('Configuração da API não encontrada. Tente novamente.')
        return
      }
      const cleanDocument = onlyDigits(document)
      if (!cleanDocument) {
        setError('Informe o CPF para continuar.')
        return
      }

      const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: cleanDocument }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(getErrorMessage(data))
        return
      }

      setMaskedWhatsapp(String(data?.masked_whatsapp || ''))
      setMessage(data?.message || 'Código enviado com sucesso.')
      sessionStorage.setItem('resetPasswordDocument', cleanDocument)
      setStep('code')
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const cleanCode = onlyDigits(code)
    if (cleanCode.length !== 6) {
      setError('Informe o código de 6 dígitos recebido no WhatsApp.')
      return
    }
    sessionStorage.setItem('resetPasswordCode', cleanCode)
    router.push('/forgot-password/new')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--selection)] px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="avelar-card backdrop-blur-3xl bg-[var(--glass-bg)]/70 p-8 border border-[var(--card-border)] shadow-2xl">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 glass rounded-[1.5rem] mb-4 overflow-hidden p-3"
              style={{
                backgroundImage: 'url(/logo-dark.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
              Recuperar Senha
            </h1>
            <p className="text-[var(--muted)] mt-2">
              {step === 'request'
                ? 'Informe seu CPF para receber um código via WhatsApp.'
                : 'Digite o código enviado para o seu WhatsApp.'}
            </p>
          </div>

          {step === 'request' ? (
            <form className="space-y-6" onSubmit={handleSendCode}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                  CPF
                </label>
                <input
                  name="document"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full h-14 px-6 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-[var(--foreground)] font-medium placeholder-[var(--muted)]/50"
                  placeholder="000.000.000-00"
                  value={document}
                  onChange={(e) => {
                    setDocument(formatDocument(e.target.value))
                    if (error) setError('')
                  }}
                  maxLength={14}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>⚠️</span> {String(error)}
                </div>
              )}

              {message && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>✅</span> {String(message)}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-14 text-base shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </div>
                ) : (
                  'Enviar Código'
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleConfirmCode}>
              <div className="bg-[var(--background)]/40 border border-[var(--card-border)] rounded-2xl p-4 text-sm text-[var(--muted)]">
                Código enviado via WhatsApp
                {maskedWhatsapp ? ` (final ${maskedWhatsapp})` : ''}.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                  Código recebido
                </label>
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full h-14 px-6 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-[var(--foreground)] font-bold text-center tracking-[0.35em]"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    if (error) setError('')
                  }}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>⚠️</span> {String(error)}
                </div>
              )}

              {message && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>✅</span> {String(message)}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  className="btn-primary w-full h-14 text-base shadow-xl hover:shadow-2xl hover:-translate-y-1"
                >
                  Confirmar código
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendCode}
                  className="w-full h-12 rounded-2xl border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--card)]/60 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[var(--foreground)] border-t-transparent rounded-full animate-spin"></div>
                      Reenviando...
                    </>
                  ) : (
                    'Reenviar código'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => handleNav('/login')}
              disabled={loading || !!navLoading}
              className="font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {navLoading === '/login' && (
                <div className="w-3 h-3 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
              )}
              Voltar ao login
            </button>
            <button
              type="button"
              onClick={() => handleNav('/register')}
              disabled={loading || !!navLoading}
              className="font-bold text-[var(--accent)] hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {navLoading === '/register' && (
                <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
              )}
              Criar conta nova →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
