'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Service {
  slug: string
  name: string
  desc: string
  icon: string
  target: string
  available: boolean
}

const DEFAULT_SERVICES: Service[] = [
  { slug: 'stocktech', name: 'StockTech', desc: 'Marketplace B2B de Eletrônicos', icon: '📦', target: 'lojista', available: false },
  { slug: 'shop', name: 'Shop', desc: 'E-commerce para consumidores', icon: '🛒', target: 'cliente', available: false },
  { slug: 'naldogas', name: 'NaldoGas', desc: 'Distribuição de Gás', icon: '⛽', target: 'lojista', available: false },
  { slug: 'lucrum', name: 'Lucrum', desc: 'Gestão Financeira', icon: '💰', target: 'lojista', available: false },
]

export default function ServicesPage() {
  const router = useRouter()
  const [loadingService, setLoadingService] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [loading, setLoading] = useState(true)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://app.avelarcompany.com.br'

  useEffect(() => {
    const fetchAvailableServices = async () => {
      try {
        const res = await fetch(`${apiBase}/api/plans/public/pricing`)
        if (!res.ok) throw new Error('Falha ao carregar serviços')
        const data = await res.json()
        
        // Extract all modules from active plans
        const modulesFromPlans = new Set<string>()
        data.plans.forEach((p: any) => {
          p.modules.forEach((m: string) => {
            modulesFromPlans.add(m)
          })
        })

        // Create a map of active modules (case-insensitive)
        const activeModulesMap = new Map<string, string>()
        modulesFromPlans.forEach(m => activeModulesMap.set(m.toLowerCase(), m))

        // Update default services availability and add new ones if found
        const updatedServices = [...DEFAULT_SERVICES]
        
        // 1. Mark existing ones as available if found in DB
        updatedServices.forEach(s => {
          if (activeModulesMap.has(s.slug.toLowerCase()) || activeModulesMap.has(s.name.toLowerCase())) {
            s.available = true
            activeModulesMap.delete(s.slug.toLowerCase())
            activeModulesMap.delete(s.name.toLowerCase())
          }
        })

        // 2. Add any new modules found in the DB that aren't in our default list
        activeModulesMap.forEach((originalName, slug) => {
          updatedServices.push({
            slug: slug,
            name: originalName,
            desc: `Módulo ${originalName} disponível para contratação`,
            icon: '📦',
            target: 'lojista',
            available: true
          })
        })

        setServices(updatedServices)
        
        // Prefetch available routes
        updatedServices
          .filter((s) => s.available)
          .forEach((s) => {
            router.prefetch(`/register/plan?service=${encodeURIComponent(s.slug)}`)
          })
      } catch (err) {
        console.error('Error fetching services:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableServices()
  }, [router, apiBase])

  return (
    <div className="min-h-screen relative flex items-start sm:items-center justify-center bg-[var(--background)] px-4 py-6 sm:py-10 overflow-hidden text-[var(--foreground)] selection:bg-[var(--selection)]">
      {/* Background Blobs */}
      <div className="avelar-blob top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20"></div>
      <div className="avelar-blob bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[var(--muted)]/30" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-4xl animate-fadeIn">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4 text-[var(--foreground)]">Escolha o Serviço</h1>
          <p className="text-lg text-[var(--muted)] font-medium">Selecione qual módulo você deseja contratar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-bold">Verificando serviços disponíveis...</p>
            </div>
          ) : services.map((s, index) => {
            const baseClass = `group relative p-6 sm:p-8 rounded-[2rem] text-left transition-all duration-500 border border-[var(--card-border)] overflow-hidden ${
              s.available 
                ? 'bg-[var(--background)] hover:border-[var(--accent)] hover:shadow-2xl hover:-translate-y-2 cursor-pointer' 
                : 'bg-[var(--card)] opacity-60 cursor-not-allowed'
            }`
            
            const content = (
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner transition-transform duration-500 ${
                    s.available ? 'bg-[var(--muted)]/20 group-hover:scale-110' : 'bg-[var(--card-border)]'
                  }`}>
                    {s.icon}
                  </div>
                  {s.available ? (
                    <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--accent)] group-hover:text-[var(--background)] group-hover:border-transparent transition-all">
                      {loadingService === s.slug ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        '➜'
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-widest bg-[var(--card-border)] px-3 py-1 rounded-full text-[var(--muted)]">
                      Em Breve
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight">{s.name}</h3>
                <p className="text-sm font-medium text-[var(--muted)] mb-6">{s.desc}</p>
                
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  s.target === 'lojista' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-[var(--muted)]/20 text-[var(--muted)]'
                }`}>
                  {s.target === 'lojista' ? 'Para Negócios' : 'Para Clientes'}
              </span>
              </div>
            )

            if (!s.available) {
              return (
                <div key={s.slug} className={baseClass} aria-disabled="true" style={{ animationDelay: `${index * 100}ms` }}>
                  {content}
                </div>
              )
            }

            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => {
                  setLoadingService(s.slug)
                  setTimeout(() => {
                    router.push(`/register/plan?service=${encodeURIComponent(s.slug)}`)
                  }, 500)
                }}
                disabled={!!loadingService}
                className={baseClass}
                style={{ animationDelay: `${index * 100}ms` }}
                aria-busy={loadingService === s.slug}
              >
                {content}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
