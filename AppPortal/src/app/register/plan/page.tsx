'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  billing_cycle: string
  trial_days: number
  plan_type: string
  max_users: number
  max_products: number
  is_popular: boolean
  modules: string[]
}

function PlanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState('')
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://app.avelarcompany.com.br'

  const service = searchParams.get('service') || 'stocktech'

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${apiBase}/api/plans/public/pricing`)
        if (!res.ok) throw new Error('Falha ao carregar planos')
        const data = await res.json()
        
        // Filter plans by service if specified
        const filteredPlans = data.plans.filter((p: any) => {
          if (!service) return true;
          
          const searchService = service.toLowerCase();
          const planModules = (p.modules || []).map((m: string) => m.toLowerCase());
          
          // Fallback check for StockTech (case variations)
          return planModules.includes(searchService) || 
                 (searchService === 'stocktech' && planModules.some((m: string) => m.includes('stock')));
        })
        
        setPlans(filteredPlans)
      } catch (err) {
        console.error('Error fetching plans:', err)
        setError('Não foi possível carregar os planos. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
    router.prefetch('/register/success')
    router.prefetch('/login')
  }, [router, apiBase, service])

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % 3)
    }, 2000)
    return () => clearInterval(interval)
  }, [loading])

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

  const onlyDigits = (value: string) => value.replace(/\D/g, '')
  const normalizeWhatsapp = (value: string) => {
    let digits = onlyDigits(value)
    if (digits.startsWith('0') && digits.length > 11) {
      digits = digits.replace(/^0+/, '')
    }
    return digits
  }

  const isAlreadyRegisteredError = (message: string) => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('já cadastrado') ||
      normalized.includes('ja cadastrado') ||
      normalized.includes('já existe') ||
      normalized.includes('ja existe')
    )
  }

  const redirectToVerification = () => {
    router.push('/register/success')
  }

  const getClientTypeFromPlan = (plan: Plan) => {
    if (plan.plan_type === 'individual') return 'cliente'
    return 'lojista'
  }

  const handleSelect = async (plan: Plan) => {
    setLoadingPlanId(plan.id)
    setLoading(true)
    setError('')
    sessionStorage.setItem('selectedPlan', plan.slug)
    sessionStorage.setItem('selectedService', service)

    try {
      if (!apiBase) {
        setError('Configuração da API não encontrada. Tente novamente.')
        return
      }
      const rawRegisterData = sessionStorage.getItem('registerData')
      if (!rawRegisterData) {
        setError('Dados do cadastro não encontrados. Volte e preencha o formulário.')
        return
      }

      const registerData = JSON.parse(rawRegisterData)

      if (registerData.type === 'cnpj') {
        const payload = {
          company_name: registerData.companyName,
          cnpj: onlyDigits(registerData.cnpj || ''),
          responsible_name: registerData.adminName,
          admin_cpf: onlyDigits(registerData.adminCpf || ''),
          whatsapp: onlyDigits(registerData.adminWhatsapp || ''),
          password: registerData.password,
          plan_slug: plan.slug,
          address: registerData.street,
          address_number: registerData.number,
          address_neighborhood: registerData.neighborhood,
          complement: registerData.complement || null,
          city: registerData.city,
          state: registerData.state,
          zip_code: onlyDigits(registerData.cep || ''),
          client_type: 'lojista',
        }

        const response = await fetch(`${apiBase}/api/auth/register/account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok) {
          const message = getErrorMessage(data)
          if (isAlreadyRegisteredError(message) && payload.admin_cpf) {
            redirectToVerification()
            return
          }
          setError(message)
          return
        }
      } else {
        const payload = {
          full_name: registerData.fullName,
          cpf: onlyDigits(registerData.cpf || ''),
          whatsapp: normalizeWhatsapp(registerData.whatsapp || ''),
          password: registerData.password,
          birth_date: registerData.birthDate ? `${registerData.birthDate}T00:00:00` : null,
          address_street: registerData.street,
          address_city: registerData.city,
          address_state: registerData.state,
          address_number: registerData.number,
          address_neighborhood: registerData.neighborhood,
          complement: registerData.complement || null,
          zip_code: onlyDigits(registerData.cep || ''),
          client_type: getClientTypeFromPlan(plan),
        }

        const response = await fetch(`${apiBase}/api/auth/register/individual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok || !data?.success) {
          const message = getErrorMessage(data)
          if (isAlreadyRegisteredError(message) && payload.cpf) {
            redirectToVerification()
            return
          }
          setError(message)
          return
        }
      }

      const fallbackDoc =
        registerData.type === 'cnpj'
          ? onlyDigits(registerData.adminCpf || registerData.cnpj || '')
          : onlyDigits(registerData.cpf || '')
      if (fallbackDoc) {
        redirectToVerification()
        return
      }
      router.push('/register/success')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
      setLoadingPlanId(null)
    }
  }

  const loadingMessages = [
    'Processando',
    'Criando seu cadastro',
    'Preparando seu futuro',
  ]

  return (
    <div className="min-h-screen relative flex items-start sm:items-center justify-center bg-[var(--background)] px-4 py-6 sm:py-10 overflow-hidden text-[var(--foreground)] selection:bg-[var(--selection)]">
      {/* Background Blobs */}
      <div className="avelar-blob top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--muted)]/30"></div>
      <div className="avelar-blob bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-5xl animate-fadeIn">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4 text-[var(--foreground)]">Escolha seu Plano</h1>
          <p className="text-lg text-[var(--muted)] font-medium">Potencialize seu negócio com o StockTech</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fadeIn">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {loading && !plans.length ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-bold">Carregando planos...</p>
            </div>
          ) : plans.length > 0 ? (
            plans.map((p, index) => (
              <div
                key={p.id}
                className={`avelar-card backdrop-blur-3xl bg-[var(--glass-bg)]/80 relative overflow-hidden transition-all duration-500 ${
                  p.is_popular 
                    ? 'border-[var(--muted)]/30 shadow-2xl scale-105 z-10 flex flex-col items-center justify-center' 
                    : 'hover:scale-[1.02]'
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {p.is_popular && (
                  <div className="absolute top-[19px] left-[4px] flex justify-center items-center flex-wrap bg-[var(--muted)]/30 text-[var(--foreground)] text-xs font-bold px-4 py-1 rounded-bl-2xl uppercase tracking-wider">
                    Mais Popular
                  </div>
                )}
                
                <div className="p-2">
                  <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">{p.name}</h3>
                  
                  <div className="mt-6 flex items-baseline gap-1 text-[var(--foreground)]">
                    <span className="text-sm font-medium self-start mt-2">R$</span>
                    <span className="text-5xl font-black tracking-tighter">
                      {typeof p.price === 'number' ? p.price.toFixed(2).split('.')[0] : '0'}
                    </span>
                    <div className="flex flex-col text-xs font-bold text-[var(--muted)]">
                      <span>,{typeof p.price === 'number' ? p.price.toFixed(2).split('.')[1] : '00'}</span>
                      <span>/{p.billing_cycle === 'monthly' ? 'mês' : p.billing_cycle === 'yearly' ? 'ano' : 'vitalício'}</span>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    <span>🎁</span> {p.trial_days} dias grátis
                  </div>

                  <hr className="my-6 border-[var(--card-border)]" />

                  <ul className="space-y-4 text-sm font-medium text-[var(--muted)]">
                    <li className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xs">✓</span>
                      Até {p.max_users} usuários
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xs">✓</span>
                      {parseInt(String(p.max_products)) >= 99999 ? 'Produtos ilimitados' : `Até ${p.max_products} produtos`}
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xs">✓</span>
                      Módulos: {p.modules.join(', ')}
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xs">✓</span>
                      Suporte via WhatsApp
                    </li>
                  </ul>

                  <button
                    onClick={() => handleSelect(p)}
                    disabled={loading}
                    className={`w-full mt-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:transform-none ${
                      p.is_popular 
                        ? 'bg-[var(--muted)]/30 text-[var(--foreground)] hover:bg-[var(--muted)]/40 hover:shadow-black/10' 
                        : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--card-border)] hover:bg-[var(--card-border)]'
                    }`}
                  >
                    {loading && loadingPlanId === p.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        {loadingMessages[loadingMessageIndex]}...
                      </span>
                    ) : 'Começar Agora'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <p className="text-xl text-[var(--muted)]">Nenhum plano disponível para este serviço no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PlanPageContent />
    </Suspense>
  )
}
