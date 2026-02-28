'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getUser,
  getAccessibleModules,
  getAuthenticatedRedirectUrl,
  getToken,
  MODULE_DOMAINS,
  MODULE_ICONS,
  MODULE_DESCRIPTIONS,
  clearAuth,
  UserInfo
} from '@/lib/redirect'

export default function SelectModulePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessibleModules, setAccessibleModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingModule, setLoadingModule] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const userData = getUser()

    if (!userData) {
      router.push('/login')
      return
    }

    if (userData.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    setAccessibleModules(getAccessibleModules(userData))
    setLoading(false)
  }, [router])

  const handleModuleSelect = (module: string) => {
    setLoadingModule(module)
    const url = MODULE_DOMAINS[module]
    const token = getToken()
    if (url && token && user) {
      window.location.href = getAuthenticatedRedirectUrl(url, token, user)
      return
    }
    if (url) {
      window.location.href = url
    }
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    clearAuth()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center text-[var(--foreground)]">
          <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Carregando módulos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--selection)] overflow-x-hidden relative">
      
      {/* Header Sticky Glass */}
      <header className="sticky top-4 z-50 px-4 sm:px-8">
        <div className="glass rounded-[2rem] px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-500 hover:bg-[var(--glass-bg)]/80">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:space-x-4">
            <div 
              className="w-12 h-12 bg-[var(--accent)] text-[var(--background)] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-2"
              style={{ 
                backgroundImage: 'url(/logo-dark.png)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-[var(--foreground)]">
                Avelar System
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted)] font-medium">
                Central de Módulos (Super Admin)
              </p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3 bg-[var(--card)] px-4 py-2 rounded-full border border-[var(--card-border)]">
              <div className="text-center sm:text-right">
                <p className="font-bold text-sm text-[var(--foreground)]">{user.full_name}</p>
                <p className="text-xs text-[var(--muted)] capitalize">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              <div className="w-10 h-10 bg-[var(--accent)] text-[var(--background)] rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                  {user.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full flex-1">
        <div className="text-center mb-12 animate-fadeIn">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-[var(--foreground)] mb-4">
              Olá, {user?.full_name?.split(' ')[0]}! 👋
            </h2>
          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto">
            Selecione um módulo abaixo para acessar
            </p>
          </div>

          {/* Module Grid */}
        <section className="animate-fadeIn">
          {accessibleModules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {accessibleModules.map((module, index) => (
                <button
                  key={module}
                  onClick={() => handleModuleSelect(module)}
                  disabled={loadingModule !== null}
                  className="avelar-card group text-left relative overflow-hidden h-full flex flex-col disabled:opacity-70"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {loadingModule === module && (
                    <div className="absolute inset-0 bg-[var(--background)]/40 backdrop-blur-sm flex items-center justify-center z-20 animate-fadeIn">
                      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-[var(--background)] rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                      {MODULE_ICONS[module] || '📦'}
                    </div>
                    <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--accent)] group-hover:text-[var(--background)] group-hover:border-transparent transition-all">
                      ➜
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-1">
                        {module}
                      </h3>
                    <p className="text-sm text-[var(--muted)] font-medium line-clamp-2">
                        {MODULE_DESCRIPTIONS[module] || 'Módulo do sistema'}
                      </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="avelar-card text-center py-16 max-w-2xl mx-auto">
              <div className="text-6xl mb-6">🔒</div>
              <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                Nenhum módulo disponível
              </h3>
              <p className="text-[var(--muted)] mb-8">
                Sua conta de Super Admin não possui módulos ativos diretamente.
              </p>
            </div>
          )}

          {/* All Modules (for reference - Super Admin only) */}
          {user?.role === 'super_admin' && (
            <div className="mt-16 pt-12 border-t border-[var(--card-border)]">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-6 uppercase tracking-widest opacity-50 text-center">
                Panorama Geral do Sistema
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(MODULE_DOMAINS).map((module) => {
                  const hasAccess = accessibleModules.includes(module)
                  return (
                    <div
                      key={module}
                      className={`p-4 rounded-2xl border transition-all ${
                        hasAccess 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-[var(--card)] border-[var(--card-border)] opacity-50'
                      }`}
                    >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 flex items-center justify-center text-xl overflow-hidden"
                        style={{ 
                          backgroundImage: 'url(/logo-dark.png)', 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center' 
                        }}
                      >
                      </div>
                      <div className="overflow-hidden">
                          <p className="font-bold text-sm text-[var(--foreground)] truncate">{module}</p>
                          <p className={`text-[10px] uppercase font-bold tracking-wider ${hasAccess ? 'text-green-600' : 'text-[var(--muted)]'}`}>
                            {hasAccess ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-12 px-4 border-t border-[var(--card-border)]/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 pt-10">
          <button 
            onClick={handleLogout} 
            disabled={isLoggingOut}
            className="btn-danger w-full max-w-xs group flex items-center justify-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saindo...
              </>
            ) : (
              <>
                <span className="group-hover:-translate-x-1 transition-transform">🚪</span>
                Encerrar Sessão
              </>
            )}
          </button>
          
          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold tracking-widest uppercase text-[var(--muted)]">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Sistema Operacional</span>
            <span>© 2026 Avelar Company</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
