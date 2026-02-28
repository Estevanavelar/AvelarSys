'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SuccessPage() {
  const router = useRouter()
  const [plan, setPlan] = useState('empresa')
  const [service, setService] = useState('stocktech')
  const [document, setDocument] = useState('')
  const [code, setCode] = useState('')
  const [loadingSend, setLoadingSend] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [navLoading, setNavLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const apiBase = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    router.prefetch('/login')
    const p = sessionStorage.getItem('selectedPlan')
    const s = sessionStorage.getItem('selectedService')
    if (p) setPlan(p)
    if (s) setService(s)
    const registerData = sessionStorage.getItem('registerData')
    if (registerData) {
      try {
        const parsed = JSON.parse(registerData)
        if (parsed?.cpf) setDocument(parsed.cpf)
        if (parsed?.adminCpf) setDocument(parsed.adminCpf)
        if (parsed?.cnpj && !parsed?.adminCpf) setDocument(parsed.cnpj)
      } catch {}
      sessionStorage.removeItem('registerData')
    }
    const verificationError = sessionStorage.getItem('verificationError')
    if (verificationError) {
      setWarning(verificationError)
      sessionStorage.removeItem('verificationError')
    }
  }, [])

  const onlyDigits = (value: string) => value.replace(/\D/g, '')

  const getErrorMessage = (data: any): string => {
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

  const handleNav = (path: string) => {
    setNavLoading(path)
    setTimeout(() => {
      router.push(path)
    }, 500)
  }

  const handleSendCode = async () => {
    setLoadingSend(true)
    setError('')
    setMessage('')
    try {
      if (!apiBase) {
        setError('Configuração da API não encontrada. Tente novamente.')
        return
      }
      const cleanDoc = onlyDigits(document)
      if (!cleanDoc) {
        setError('Informe CPF/CNPJ para enviar o código')
        return
      }
      const response = await fetch(`${apiBase}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanDoc }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(getErrorMessage(data))
        return
      }
      setMessage(data?.message || 'Código enviado com sucesso')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoadingSend(false)
    }
  }

  const handleVerifyCode = async () => {
    setLoadingVerify(true)
    setError('')
    setMessage('')
    try {
      if (!apiBase) {
        setError('Configuração da API não encontrada. Tente novamente.')
        return
      }
      const cleanDoc = onlyDigits(document)
      const cleanCode = onlyDigits(code)
      if (!cleanDoc || cleanCode.length !== 6) {
        setError('Informe CPF/CNPJ e um código de 6 dígitos')
        return
      }
      const response = await fetch(`${apiBase}/api/auth/verify-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanDoc, code: cleanCode }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(getErrorMessage(data))
        return
      }
      setMessage(data?.message || 'WhatsApp verificado com sucesso')
      sessionStorage.removeItem('selectedPlan')
      sessionStorage.removeItem('selectedService')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1200)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoadingVerify(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-start sm:items-center justify-center bg-[var(--background)] px-4 py-6 sm:py-10 overflow-hidden text-[var(--foreground)] selection:bg-[var(--selection)]">
      {/* Background Blobs */}
      <div className="avelar-blob top-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-600/20"></div>
      <div className="avelar-blob bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[var(--muted)]/30" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-lg animate-fadeIn">
        <div className="avelar-card backdrop-blur-3xl bg-[var(--glass-bg)]/90 p-8 sm:p-10 text-center border border-[var(--card-border)] shadow-2xl">
          <div 
            className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-bounce overflow-hidden p-4"
            style={{ 
              backgroundImage: 'url(/logo-dark.png)', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
          </div>
          
          <h1 className="text-3xl font-black tracking-tighter text-[var(--foreground)] mb-3">Cadastro Realizado!</h1>
          <p className="text-[var(--muted)] mb-8 font-medium">Agora vamos verificar sua identidade para sua segurança.</p>
          
          <div className="bg-[var(--background)]/50 rounded-2xl p-6 mb-8 text-left border border-[var(--card-border)]">
            <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <span className="text-green-600">📱</span> Verificação via WhatsApp
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2 ml-1">Documento</label>
                <input
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="CPF ou CNPJ"
                  className="w-full px-4 py-3 bg-gray-500/30 border border-[var(--card-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-center font-bold tracking-wider"
                />
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={loadingSend}
                className="w-full py-3 bg-[var(--foreground)] text-[var(--background)] rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity text-sm uppercase tracking-wide flex items-center justify-center gap-2"
              >
                {loadingSend ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar Código SMS'
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--card-border)]"></div></div>
                <div className="relative flex justify-center"><span className="bg-[var(--background)] px-2 text-xs text-[var(--muted)] uppercase font-bold">Confirmação</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2 ml-1">Código Recebido</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-gray-500/30 border border-[var(--card-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-center font-black tracking-[0.5em] text-xl"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={loadingVerify}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none text-sm uppercase tracking-wide flex items-center justify-center gap-2"
              >
                {loadingVerify ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Validando...
                  </>
                ) : (
                  'Verificar e Acessar →'
                )}
              </button>

              {message && <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-bold text-center">{message}</div>}
              {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold text-center">{error}</div>}
              {warning && <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm font-bold text-center">{warning}</div>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNav('/login')}
            disabled={loadingSend || loadingVerify || !!navLoading}
            className="text-sm font-bold text-[var(--accent)] hover:underline uppercase tracking-wider flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {navLoading === '/login' && (
              <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            )}
            Pular Verificação e Ir para Login
          </button>

          <p className="mt-6 text-xs text-[var(--muted)] opacity-60 font-medium">
            Se não receber o código, verifique se o número do WhatsApp informado está correto.
          </p>
        </div>
      </div>
    </div>
  )
}
