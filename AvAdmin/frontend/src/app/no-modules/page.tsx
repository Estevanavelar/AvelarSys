'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, clearAuth } from '@/lib/auth'

export default function NoModulesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(userData)
  }, [router])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const handleContactSupport = () => {
    const message = encodeURIComponent(
      `Olá! Sou ${user?.full_name || 'usuário'} e preciso de ajuda para ativar módulos na minha conta.`
    )
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Sad Face Animation */}
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
        <div className="text-[300px] animate-bounce" style={{ animationDuration: '3s' }}>
          😢
        </div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-gray-600 to-gray-800 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6 animate-pulse">
              <span className="text-6xl">😔</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Ops! Sem Módulos Ativos
            </h1>
            <p className="text-white/80 text-lg">
              Sua conta ainda não possui módulos habilitados
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            {/* User Info */}
            {user && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.full_name || 'Usuário'}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role?.replace('_', ' ') || 'Conta'}</p>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Nenhum módulo disponível
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Para utilizar o sistema, você precisa ter pelo menos um módulo ativo em sua conta. 
                Entre em contato com o suporte para solicitar a ativação.
              </p>
            </div>

            {/* Available Modules Preview */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-8">
              <p className="text-sm font-semibold text-gray-500 uppercase mb-4 text-center">
                Módulos Disponíveis
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'StockTech', icon: '📦', desc: 'Marketplace B2B' },
                  { name: 'NaldoGas', icon: '🔥', desc: 'Gestão de Gás' },
                  { name: 'Shop', icon: '🛒', desc: 'Loja Virtual' },
                  { name: 'Reports', icon: '📊', desc: 'Relatórios' },
                ].map((module) => (
                  <div
                    key={module.name}
                    className="bg-white rounded-xl p-3 border border-gray-200 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{module.icon}</span>
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{module.name}</p>
                        <p className="text-xs text-gray-400">{module.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleContactSupport}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="text-xl">📱</span>
                <span>Falar com Suporte via WhatsApp</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <span>🚪</span>
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400">
              Dúvidas? Entre em contato: suporte@avelarcompany.com.br
            </p>
          </div>
        </div>

        {/* Bottom Text */}
        <p className="text-center text-white/40 text-sm mt-6">
          © 2024 Avelar Company. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

