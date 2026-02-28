'use client'

import React, { useEffect, useState } from 'react'
import { getApiUrl } from '@/lib/api'
import Link from 'next/link'
import { getToken } from '@/lib/auth'

interface Stats {
  total_accounts: number
  total_users: number
  active_accounts: number
  whatsapp_status: string
}

interface Activity {
  action: string
  user: string
  time: string
  icon: string
  color: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = getApiUrl()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = getToken()
        
        // Fetch stats from API
        const statsResponse = await fetch(`${API_URL}/api/dashboard/stats`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        
        if (statsResponse.ok) {
          const data = await statsResponse.json()
          setStats({
            total_accounts: data.total_accounts || 0,
            total_users: data.total_users || 0,
            active_accounts: data.active_accounts || 0,
            whatsapp_status: data.whatsapp_status || 'disconnected'
          })
          setActivities(data.recent_activities || [])
        } else {
          // Fallback to basic stats if endpoint doesn't exist
          console.warn('Dashboard stats endpoint not available, using fallback')
          setStats({
            total_accounts: 1,
            total_users: 1,
            active_accounts: 1,
            whatsapp_status: 'disconnected'
          })
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Erro ao carregar dados')
        // Set fallback values
        setStats({
          total_accounts: 1,
          total_users: 1,
          active_accounts: 1,
          whatsapp_status: 'disconnected'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [API_URL])

  const statCards = [
    { 
      title: 'Total de Contas', 
      value: stats?.total_accounts || 0, 
      icon: '🏢', 
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700'
    },
    { 
      title: 'Contas Ativas', 
      value: stats?.active_accounts || 0, 
      icon: '✅', 
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      textColor: 'text-green-700'
    },
    { 
      title: 'Total de Usuários', 
      value: stats?.total_users || 0, 
      icon: '👥', 
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      textColor: 'text-purple-700'
    },
    { 
      title: 'WhatsApp Status', 
      value: stats?.whatsapp_status === 'connected' ? 'Conectado' : 'Desconectado', 
      icon: '📱', 
      gradient: stats?.whatsapp_status === 'connected' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600',
      bgGradient: stats?.whatsapp_status === 'connected' ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100',
      textColor: stats?.whatsapp_status === 'connected' ? 'text-green-700' : 'text-red-700'
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Visão geral do sistema AvAdmin
        </p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
          <p className="font-medium">⚠️ {error}</p>
          <p className="text-sm mt-1">Exibindo dados locais.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.bgGradient} border-0 hover:scale-105 transition-all duration-300`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-semibold ${card.textColor} mb-2 uppercase tracking-wide`}>
                  {card.title}
                </p>
                <p className={`text-4xl font-bold ${card.textColor}`}>
                  {loading ? (
                    <span className="skeleton w-16 h-10 inline-block rounded"></span>
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3 text-3xl">📋</span>
              Atividade Recente
            </h2>
            <Link href="#" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
                >
                  <div className={`w-12 h-12 ${activity.color || 'bg-gray-100 text-gray-700'} rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500 font-medium">Nenhuma atividade recente</p>
                <p className="text-sm text-gray-400 mt-1">As atividades do sistema aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-modern">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3 text-3xl">⚡</span>
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Nova Conta', icon: '➕', href: '/dashboard/accounts', gradient: 'from-blue-500 to-blue-600' },
              { name: 'Novo Usuário', icon: '👤', href: '/dashboard/users', gradient: 'from-purple-500 to-purple-600' },
              { name: 'Config WhatsApp', icon: '📱', href: '/dashboard/whatsapp', gradient: 'from-green-500 to-green-600' },
              { name: 'Configurações', icon: '⚙️', href: '/dashboard/settings', gradient: 'from-gray-500 to-gray-600' },
            ].map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:bg-gradient-to-br hover:from-primary-50 hover:to-primary-100 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white text-2xl mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {action.icon}
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-primary-700 text-sm text-center">
                  {action.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-3 text-3xl">🔧</span>
          Status do Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'API Backend', status: 'online', latency: 'Ativo', icon: '⚡' },
            { name: 'Banco de Dados', status: 'online', latency: 'Ativo', icon: '💾' },
            { name: 'WPPConnect', status: stats?.whatsapp_status === 'connected' ? 'online' : 'offline', latency: stats?.whatsapp_status === 'connected' ? 'Conectado' : 'Aguardando', icon: '📱' },
          ].map((service, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${service.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'} shadow-lg`}></div>
                <div>
                  <span className="text-lg mr-2">{service.icon}</span>
                  <span className="font-semibold text-gray-700">{service.name}</span>
                </div>
              </div>
              <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${service.status === 'online' ? 'text-green-700 bg-green-100' : 'text-yellow-700 bg-yellow-100'}`}>
                {service.latency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
