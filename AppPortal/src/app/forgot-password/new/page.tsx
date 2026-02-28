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

export default function NewPasswordPage() {
  const router = useRouter()
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const [document, setDocument] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [navLoading, setNavLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    router.prefetch('/login')
    const storedDocument = sessionStorage.getItem('resetPasswordDocument') || ''
    const storedCode = sessionStorage.getItem('resetPasswordCode') || ''
    setDocument(storedDocument)
    setCode(storedCode)
  }, [router])

  const handleNav = (path: string) => {
    setNavLoading(path)
    setTimeout(() => {
      router.push(path)
    }, 500)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!apiBase) {
        setError('Configuração da API não encontrada. Tente novamente.')
        return
      }
      if (!document || !code) {
        setError('Código de recuperação inválido. Solicite novamente.')
        return
      }
      if (!password || password.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }

      const response = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document,
          code,
          new_password: password,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(getErrorMessage(data))
        return
      }

      setMessage(data?.message || 'Senha alterada com sucesso.')
      sessionStorage.removeItem('resetPasswordDocument')
      sessionStorage.removeItem('resetPasswordCode')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const hasResetData = document && code

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
              Nova Senha
            </h1>
            <p className="text-[var(--muted)] mt-2">
              Defina uma nova senha para acessar sua conta.
            </p>
          </div>

          {!hasResetData && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 p-4 rounded-2xl text-sm font-medium mb-6">
              Código de recuperação não encontrado. Solicite novamente.
            </div>
          )}

          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full h-14 px-6 pr-14 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-[var(--foreground)] font-medium placeholder-[var(--muted)]/50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full h-14 px-6 pr-14 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-[var(--foreground)] font-medium placeholder-[var(--muted)]/50"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (error) setError('')
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
              disabled={loading || !hasResetData}
              className="btn-primary w-full h-14 text-base shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-60 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
                  Atualizando...
                </div>
              ) : (
                'Salvar nova senha'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => handleNav('/forgot-password')}
              disabled={loading || !!navLoading}
              className="font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {navLoading === '/forgot-password' && (
                <div className="w-3 h-3 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
              )}
              Voltar
            </button>
            <button
              type="button"
              onClick={() => handleNav('/login')}
              disabled={loading || !!navLoading}
              className="font-bold text-[var(--accent)] hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {navLoading === '/login' && (
                <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
              )}
              Ir para login →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
