'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getUser, clearAuth } from '@/lib/auth'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  getAccessibleModules,
  getAuthenticatedRedirectUrl,
  MODULE_DOMAINS,
  MODULE_ICONS,
  MODULE_DESCRIPTIONS,
  MODULE_COLORS,
  UserInfo
} from '@/lib/modules'

export default function SelectModulePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessibleModules, setAccessibleModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const token = getToken()
    const userData = getUser()

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(userData as UserInfo)
    setAccessibleModules(getAccessibleModules(userData as UserInfo))
    setLoading(false)
  }, [router])

  const handleModuleSelect = (module: string) => {
    const token = getToken()
    if (!token || !user) return

    setNavigating(module)

    // If selecting AvAdmin, go to dashboard
    if (module === 'AvAdmin') {
      router.push('/dashboard')
      return
    }

    // For other modules, redirect with auth token
    const moduleUrl = MODULE_DOMAINS[module]
    if (moduleUrl) {
      const authenticatedUrl = getAuthenticatedRedirectUrl(moduleUrl, token, user)
      window.location.href = authenticatedUrl
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Carregando módulos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-2"
              style={{ 
                backgroundImage: 'url(/logo-dark.png)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Avelar System</h1>
              <p className="text-sm text-white/70">Portal Unificado</p>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right text-white hidden md:block">
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-white/70 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl transition-all flex items-center space-x-2 border border-white/20 hover:border-red-400/50"
              >
                <span>🚪</span>
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 animate-fade-in">
              Olá, {user?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-xl text-white/80 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Selecione o módulo que deseja acessar
            </p>
          </div>

          {/* Module Grid */}
          {accessibleModules.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {accessibleModules.map((module, index) => {
                const colors = MODULE_COLORS[module] || MODULE_COLORS['AvAdmin']
                const isNavigating = navigating === module

                return (
                  <button
                    key={module}
                    onClick={() => handleModuleSelect(module)}
                    disabled={navigating !== null}
                    className={`group relative bg-white/95 backdrop-blur-sm rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in overflow-hidden ${
                      isNavigating ? 'ring-2 ring-primary-500' : ''
                    } ${navigating && !isNavigating ? 'opacity-50' : ''}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Gradient Overlay on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                    <div className="relative flex items-start space-x-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center text-3xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        {isNavigating ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          MODULE_ICONS[module] || '📦'
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold text-gray-900 group-hover:${colors.text} transition-colors`}>
                          {module}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {MODULE_DESCRIPTIONS[module] || 'Módulo do sistema'}
                        </p>
                        <div className={`mt-4 flex items-center ${colors.text} font-medium`}>
                          <span>{isNavigating ? 'Acessando...' : 'Acessar'}</span>
                          <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Active indicator */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bg} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}></div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center shadow-xl animate-fade-in">
              <div className="text-6xl mb-6">🔒</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Nenhum módulo disponível
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Sua conta ainda não tem módulos habilitados. Entre em contato com o administrador para solicitar acesso.
              </p>
              <a
                href="https://wa.me/5511999999999?text=Olá! Preciso de ajuda para habilitar módulos na minha conta."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <span>📱</span>
                <span>Contatar Suporte</span>
              </a>
            </div>
          )}

          {/* Admin View - All Modules */}
          {user?.role === 'super_admin' && (
            <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-lg font-semibold text-white/80 mb-4">Todos os Módulos do Sistema</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(MODULE_DOMAINS).map((module) => {
                  const hasAccess = accessibleModules.includes(module)
                  return (
                    <div
                      key={module}
                      className={`p-4 rounded-xl ${hasAccess ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/10'} border transition-all hover:bg-white/10`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 flex items-center justify-center text-2xl overflow-hidden"
                          style={{ 
                            backgroundImage: 'url(/logo-dark.png)', 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center' 
                          }}
                        >
                        </div>
                        <div>
                          <p className="font-medium text-white">{module}</p>
                          <p className={`text-xs ${hasAccess ? 'text-green-400' : 'text-white/50'}`}>
                            {hasAccess ? '✓ Ativo' : '○ Inativo'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-white/60 text-sm">
          <p>© 2024 Avelar Company. Todos os direitos reservados.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="flex items-center space-x-1"><span>🔒</span><span>SSL/TLS</span></span>
            <span className="flex items-center space-x-1"><span>📱</span><span>WhatsApp-First</span></span>
            <span className="flex items-center space-x-1"><span>🇧🇷</span><span>Brasil</span></span>
          </div>
        </div>
      </footer>
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sair do sistema"
        message="Deseja realmente sair do sistema?"
        confirmLabel="Sair"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false)
          clearAuth()
          router.push('/login')
        }}
      />
    </div>
  )
}

