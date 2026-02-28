'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/api'

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

// Types
interface LoginRequest {
  document: string
  password: string
}

interface UserInfo {
  id: string
  full_name: string
  cpf: string
  whatsapp: string
  role: string
  account_id?: string
  client_type?: string
  is_active: boolean
  whatsapp_verified: boolean
  enabled_modules: string[]
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: UserInfo
}

interface WhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserInfo
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, user, onVerify, onResend }) => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleVerify = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError('')

    try {
      await onVerify(code)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await onResend()
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-modern max-w-md w-full animate-slide-in-right">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">📱</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Verificação WhatsApp</h3>
          <p className="text-gray-600">
            Enviamos um código de 6 dígitos para:
            <br />
            <strong className="text-primary-600 text-lg">{user.whatsapp}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input-modern text-center text-3xl font-mono tracking-[0.5em] py-4"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
              <span className="text-red-500 mr-3 text-xl">⚠️</span>
              <span className="text-sm font-medium">{String(error)}</span>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Verificando...
              </>
            ) : (
              '✅ Verificar Código'
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-gray-600 text-sm mb-2">Não recebeu o código?</p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-primary-600 hover:text-primary-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading ? '⏳ Enviando...' : '🔄 Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const API_URL = getApiUrl()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState<LoginRequest>({
    document: '',
    password: ''
  })
  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean
    user?: UserInfo
  }>({ isOpen: false })

  // Check if already authenticated (from AppPortal redirect or existing session)
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const url = new URL(window.location.href)
        const authParam = url.searchParams.get('auth')
        
        if (authParam) {
          // Decode the auth parameter (it's URL encoded)
          const decodedAuth = decodeURIComponent(authParam)
          const params = new URLSearchParams(decodedAuth)
          const token = params.get('token')
          const userBase64 = params.get('user')
          
          if (token && userBase64) {
            const user = JSON.parse(atob(userBase64))
            localStorage.setItem('avelar_token', token)
            localStorage.setItem('avelar_user', JSON.stringify(user))
            localStorage.setItem('avadmin_token', token)
            localStorage.setItem('avadmin_user', JSON.stringify(user))
            
            // Clean URL
            window.history.replaceState({}, '', '/login')
            
            // Smart redirect based on modules
            const { getPostLoginRedirect } = await import('@/lib/modules')
            const redirect = getPostLoginRedirect(user, token)
            
            if (redirect.type === 'multiple') {
              router.replace('/select-module')
            } else {
              router.replace('/dashboard')
            }
            return
          }
        }
        
        // Check existing session
        const existingToken = localStorage.getItem('avelar_token') || localStorage.getItem('avadmin_token')
        const existingUser = localStorage.getItem('avelar_user') || localStorage.getItem('avadmin_user')
        
        if (existingToken && existingUser) {
          const user = JSON.parse(existingUser)
          const { getPostLoginRedirect } = await import('@/lib/modules')
          const redirect = getPostLoginRedirect(user, existingToken)
          
          if (redirect.type === 'multiple') {
            router.replace('/select-module')
          } else {
            router.replace('/dashboard')
          }
          return
        }
      } catch (err) {
        console.warn('Auth check failed:', err)
      }
      
      // Load saved credentials
      const saved = localStorage.getItem('avadmin_credentials')
      if (saved) {
        try {
          const credentials = JSON.parse(saved)
          setFormData(credentials)
          setRememberMe(true)
        } catch (err) {
          console.warn('Failed to load saved credentials')
        }
      }
    }
    
    checkAuthAndRedirect()
  }, [router])

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  }

  const validateDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 11) {
      if (numbers === '00000000000') return true
      const cpf = numbers.split('').map(Number)
      if (cpf.every(d => d === cpf[0])) return false
      const calc = (pos: number) => cpf.slice(0, pos).reduce((acc, val, idx) => acc + val * (pos + 1 - idx), 0) % 11
      const digit1 = calc(9) < 2 ? 0 : 11 - calc(9)
      const digit2 = calc(10) < 2 ? 0 : 11 - calc(10)
      return digit1 === cpf[9] && digit2 === cpf[10]
    } else if (numbers.length === 14) {
      return numbers.length === 14
    }
    return false
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === 'document') {
      const formatted = formatDocument(value)
      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleWhatsAppVerify = async (code: string) => {
    if (!whatsappModal.user) return

    const response = await fetch(`${API_URL}/api/auth/verify-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpf: whatsappModal.user.cpf,
        code: code
      }),
    })

    const data = await response.json()

    if (response.ok) {
      const user = { ...whatsappModal.user, whatsapp_verified: true }
      
      localStorage.setItem('avadmin_token', data.access_token)
      localStorage.setItem('avadmin_user', JSON.stringify(user))
      localStorage.setItem('avelar_token', data.access_token)
      localStorage.setItem('avelar_user', JSON.stringify(user))

      if (rememberMe) {
        localStorage.setItem('avadmin_credentials', JSON.stringify(formData))
      } else {
        localStorage.removeItem('avadmin_credentials')
      }

      setWhatsappModal({ isOpen: false })
      setSuccess('WhatsApp verificado! Redirecionando...')

      // Smart redirect based on modules
      const { getPostLoginRedirect } = await import('@/lib/modules')
      const redirect = getPostLoginRedirect(user as any, data.access_token)

      setTimeout(() => {
        if (redirect.type === 'single' && redirect.url) {
          if (redirect.url.startsWith('/')) {
            router.push(redirect.url)
          } else {
            window.location.href = redirect.url
          }
        } else if (redirect.type === 'multiple') {
          router.push('/select-module')
        } else {
          router.push('/dashboard')
        }
      }, 1000)
    } else {
      throw new Error(data.detail || 'Código inválido')
    }
  }

  const handleResendCode = async () => {
    if (!whatsappModal.user) return

    const response = await fetch(`${API_URL}/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: whatsappModal.user.cpf }),
    })

    if (!response.ok) {
      throw new Error('Erro ao reenviar código')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const cleanDocument = formData.document.replace(/\D/g, '')
      if (!validateDocument(formData.document)) {
        throw new Error('CPF ou CNPJ inválido')
      }

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: cleanDocument,
          password: formData.password
        }),
      })

      const data: LoginResponse | any = await response.json()

      if (response.ok) {
        if (data.user.role !== 'super_admin' && !data.user.whatsapp_verified) {
          setWhatsappModal({ isOpen: true, user: data.user })
          return
        }

        // Save authentication
        localStorage.setItem('avadmin_token', data.access_token)
        localStorage.setItem('avadmin_user', JSON.stringify(data.user))
        localStorage.setItem('avelar_token', data.access_token)
        localStorage.setItem('avelar_user', JSON.stringify(data.user))

        if (rememberMe) {
          localStorage.setItem('avadmin_credentials', JSON.stringify(formData))
        } else {
          localStorage.removeItem('avadmin_credentials')
        }

        // Smart redirect based on modules
        const { getPostLoginRedirect } = await import('@/lib/modules')
        const redirect = getPostLoginRedirect(data.user, data.access_token)

        setSuccess('Login realizado com sucesso! Redirecionando...')

        setTimeout(() => {
          if (redirect.type === 'single' && redirect.url) {
            // Single module - redirect directly
            if (redirect.url.startsWith('/')) {
              router.push(redirect.url)
            } else {
              window.location.href = redirect.url
            }
          } else if (redirect.type === 'multiple') {
            // Multiple modules - show selection page
            router.push('/select-module')
          } else {
            // No modules - show no-modules page
            router.push('/no-modules')
          }
        }, 1000)
      } else {
        if (response.status === 422) {
          const errorData = data as any
          if (errorData.detail?.action === 'verify_whatsapp') {
            const user = {
              id: 'temp',
              full_name: errorData.detail.user_name || 'Usuário',
              cpf: cleanDocument,
              whatsapp: errorData.detail.whatsapp || '',
              role: 'user',
              is_active: true,
              whatsapp_verified: false,
              enabled_modules: []
            }
            setWhatsappModal({ isOpen: true, user })
            return
          }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-12">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Logo & Header */}
            <div className="text-center">
              <div 
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-3xl shadow-2xl mb-6 hover:scale-105 transition-transform duration-300 overflow-hidden p-4"
                style={{ 
                  backgroundImage: 'url(/logo-dark.png)', 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center' 
                }}
              >
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                AvAdmin
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                Avelar Company
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Painel de Administração Empresarial
              </p>
            </div>

            {/* Login Card */}
            <div className="card-modern">
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Document Input */}
                <div>
                  <label htmlFor="document" className="block text-sm font-semibold text-gray-700 mb-2">
                    CPF ou CNPJ
                  </label>
                  <div className="relative">
                    <input
                      id="document"
                      name="document"
                      type="text"
                      autoComplete="username"
                      required
                      className="input-modern pl-12"
                      placeholder="000.000.000-00"
                      value={formData.document}
                      onChange={handleInputChange}
                      maxLength={18}
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="input-modern pr-12"
                      placeholder="Digite sua senha"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Lembrar-me</span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      toast.info('Funcionalidade de recuperação de senha será implementada em breve.', { duration: 5000 })
                    }}
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start animate-slide-in-right">
                    <span className="text-red-500 mr-3 text-xl flex-shrink-0">⚠️</span>
                    <span className="text-sm font-medium">{String(error)}</span>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start animate-slide-in-right">
                    <span className="text-green-500 mr-3 text-xl flex-shrink-0">✅</span>
                    <span className="text-sm font-medium">{String(success)}</span>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-lg py-4"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner mr-3"></div>
                      Entrando no sistema...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>
                      Entrar no Sistema
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center">
                    <span className="mr-1">🔒</span>
                    SSL/TLS
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <span className="mr-1">📱</span>
                    WhatsApp Verify
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <span className="mr-1">🇧🇷</span>
                    100% Nacional
                  </span>
                </div>
                <p className="text-center text-xs text-gray-400">
                  © 2024 Avelar Company. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 w-full flex items-center justify-center p-12">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center text-white max-w-lg">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-lg rounded-3xl mb-8 shadow-2xl hover:scale-110 transition-transform duration-300">
                <span className="text-5xl">🚀</span>
              </div>

              <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                AvelarSys
              </h1>
              <p className="text-2xl opacity-90 mb-4 font-medium">
                Sistema SaaS Multi-Tenant
              </p>
              <p className="text-lg opacity-75 mb-12">
                Arquitetura Microservices
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-1 gap-4 text-left bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    📱
                  </div>
                  <div>
                    <div className="font-bold text-lg">WhatsApp-First</div>
                    <div className="text-sm opacity-75">Autenticação via WhatsApp</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    🏗️
                  </div>
                  <div>
                    <div className="font-bold text-lg">Microservices</div>
                    <div className="text-sm opacity-75">Arquitetura escalável</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    🇧🇷
                  </div>
                  <div>
                    <div className="font-bold text-lg">100% Brasileiro</div>
                    <div className="text-sm opacity-75">Desenvolvido no Brasil</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    🔒
                  </div>
                  <div>
                    <div className="font-bold text-lg">Enterprise Security</div>
                    <div className="text-sm opacity-75">Segurança de nível corporativo</div>
                  </div>
                </div>
              </div>

              <div className="text-sm opacity-75 space-y-2">
                <p className="font-semibold text-lg">🚀 Transformando o futuro do B2B brasileiro</p>
                <p className="opacity-60">AvAdmin • StockTech • Lucrum</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsappModal.isOpen}
        user={whatsappModal.user!}
        onVerify={handleWhatsAppVerify}
        onResend={handleResendCode}
        onClose={() => setWhatsappModal({ isOpen: false })}
      />
    </div>
  )
}
