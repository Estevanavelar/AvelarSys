'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getRedirectUrl, saveAuth, getAuthenticatedRedirectUrl, UserInfo } from '@/lib/redirect'

// Helper function to extract error message from any error shape
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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const errorParam = searchParams.get('error')

  const [loading, setLoading] = useState(false)
  const [navLoading, setNavLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  
  const showToast = (message: string) => {
    setToastMessage(message)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 5000)
  }
  
  const [formData, setFormData] = useState({
    document: '',
    password: ''
  })

  useEffect(() => {
    if (errorParam === 'module_not_enabled') {
      setError('Você não tem acesso a este módulo. Entre em contato com o administrador.')
    } else if (errorParam === 'access_denied') {
      setError('Acesso negado. Seu tipo de conta não permite acessar este recurso.')
    } else if (errorParam === 'session_expired') {
      setError('Sua sessão expirou. Faça login novamente.')
    }
  }, [errorParam])

  useEffect(() => {
    router.prefetch('/register')
  }, [router])


  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'document') {
      setFormData(prev => ({ ...prev, [name]: formatDocument(value) }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    if (error) setError('')
  }

  const handleNav = (path: string) => {
    setNavLoading(path)
    setTimeout(() => {
      router.push(path)
    }, 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const cleanDocument = formData.document.replace(/\D/g, '')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: cleanDocument,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const token = data?.access_token
        const user = data?.user
        if (!token || !user?.id || !user?.cpf) {
          setError('Resposta inválida do servidor. Tente novamente.')
          return
        }
        saveAuth(token, user)
        const baseRedirectUrl = getRedirectUrl(data.user, redirectParam || undefined)

        if (baseRedirectUrl.startsWith('http')) {
          const authUrl = getAuthenticatedRedirectUrl(baseRedirectUrl, token, user)
          setToastMessage('Redirecionando...')
          setToastVisible(true)
          window.location.href = authUrl
        } else {
          router.push(baseRedirectUrl)
        }
      } else {
        const detail = data?.detail
        const detailMessage =
          typeof detail === 'string'
            ? detail
            : detail?.message || detail?.error || ''
        const shouldVerify =
          detail?.action === 'verify_whatsapp' ||
          detailMessage.toLowerCase().includes('whatsapp') ||
          detailMessage.toLowerCase().includes('verificado')

        if (shouldVerify || response.status === 422) {
          const cleanDoc = formData.document.replace(/\D/g, '')
          const storedPayload = cleanDoc.length > 11 ? { cnpj: cleanDoc } : { cpf: cleanDoc }
          sessionStorage.setItem('registerData', JSON.stringify(storedPayload))
          setError(getErrorMessage(data))
          setTimeout(() => {
            window.location.href = '/register/success'
          }, 1500)
          return
        }
        setError(getErrorMessage(data))
      }
    } catch (err: any) {
      setError(getErrorMessage(err))
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--selection)] overflow-hidden">
      {toastVisible && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className="glass bg-[var(--accent)] text-[var(--background)] px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3">
            <span>ℹ️</span> {toastMessage}
          </div>
        </div>
      )}

      {/* Global Blobs (already in layout, but added here just in case layout is skipped or specific positioning needed) */}

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12 bg-[var(--card)]/30 backdrop-blur-3xl border-r border-[var(--card-border)]">
        <div className="relative z-10 text-center max-w-lg">
          <div 
            className="inline-flex items-center justify-center w-32 h-32 glass rounded-[2.5rem] mb-12 shadow-2xl overflow-hidden p-6"
            style={{ 
              backgroundImage: 'url(/logo-dark.png)', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
          </div>

          <h1 className="text-6xl font-black tracking-tighter mb-8 text-[var(--foreground)] leading-tight">
            Avelar<br/>System
          </h1>

          <div className="space-y-6 text-left">
            {[
              { icon: '📦', title: 'StockTech', desc: 'Marketplace B2B' },
              { icon: '/logo.svg', title: 'AvAdmin', desc: 'Administração' },
              { icon: '🛒', title: 'Shop', desc: 'E-commerce' },
            ].map((item, i) => (
              <div key={i} className="glass p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform duration-500">
                <div className="w-12 h-12 flex items-center justify-center text-3xl overflow-hidden">
                  {item.icon.startsWith('/') ? (
                    <img src={item.icon} alt={item.title} className="w-full h-full object-contain brightness-0 invert" />
                  ) : (
                    item.icon
                  )}
                </div>
                <div>
                  <div className="font-bold text-[var(--foreground)]">{item.title}</div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-widest">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-24">
        <div className="w-full max-w-md animate-slideIn">
          
          <div className="lg:hidden text-center mb-10">
            <div 
              className="inline-flex items-center justify-center w-20 h-20 glass rounded-[2rem] mt-[30px] mb-[7px] overflow-hidden p-4"
              style={{ 
                backgroundImage: 'url(/logo-dark.png)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-[var(--foreground)]">Avelar System</h1>
          </div>

          {/* Login Card */}
          <div className="avelar-card backdrop-blur-3xl bg-[var(--glass-bg)]/60">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Login</h2>
              <p className="text-[var(--muted)] mt-2">Digite suas credenciais para acessar.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                  CPF ou CNPJ
                </label>
                  <input
                    name="document"
                    type="text"
                    autoComplete="username"
                    required
                  className="w-full h-14 px-6 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-gray-500/30 transition-all text-[var(--foreground)] font-medium placeholder-[var(--muted)]/50"
                    placeholder="000.000.000-00"
                    value={formData.document}
                    onChange={handleInputChange}
                    maxLength={18}
                  />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 ml-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full h-14 px-6 pr-14 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-gray-500/30 transition-all text-[var(--foreground)] font-medium placeholder-[var(--muted)]/50"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
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

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>⚠️</span> {String(error)}
                </div>
              )}

              {redirectParam && (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                  <span>ℹ️</span> Redirecionando após login...
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-16 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
                    Acessando...
                  </div>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => handleNav('/forgot-password')}
                  disabled={loading || !!navLoading}
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {navLoading === '/forgot-password' && (
                    <div className="w-3 h-3 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/register')}
                  disabled={loading || !!navLoading}
                  className="text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {navLoading === '/register' && (
                    <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Criar Conta Nova →
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-10 text-center">
             <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] opacity-50 mt-[30px] mb-[30px]">
                © 2026 Avelar Company • Seguro SSL
              </p>
          </div>
        </div>
      </div>
    </div>
  )
}
