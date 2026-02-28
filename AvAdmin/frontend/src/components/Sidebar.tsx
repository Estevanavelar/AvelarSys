'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getUser, clearAuth, UserInfo } from '@/lib/auth'
import ConfirmDialog from '@/components/ConfirmDialog'

interface MenuItem {
  name: string
  href: string
  icon: string
  badge?: string
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Contas', href: '/dashboard/accounts', icon: '🏢' },
  { name: 'Usuários', href: '/dashboard/users', icon: '👥' },
  { name: 'Planos', href: '/dashboard/plans', icon: '💎' },
  { name: 'Faturamento', href: '/dashboard/billing', icon: '💰' },
  { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: '📱', badge: 'WPP' },
  { name: 'Configurações', href: '/dashboard/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-72 sidebar-modern flex flex-col z-50 shadow-2xl">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center space-x-4 w-full">
            <div 
              className="w-12 h-12 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 overflow-hidden p-2"
              style={{ 
                backgroundImage: 'url(/logo-dark.png)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-xl text-white">AvAdmin</h1>
              <p className="text-xs text-white/60 font-medium">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={item.href} className="animate-slide-in-right" style={{ animationDelay: `${index * 0.1}s` }}>
                <Link
                  href={item.href}
                  className={`nav-link ${isActive(item.href) ? 'nav-link-active' : ''}`}
                >
                  <span className="text-2xl mr-4">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className={`badge badge-success text-xs px-2 py-0.5 ${
                      isActive(item.href) ? 'bg-white/20 text-white' : ''
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive(item.href) && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">
                  {user?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-white/60 truncate capitalize">
                  {user?.role?.replace('_', ' ') || 'carregando...'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all duration-200 border border-red-500/20 hover:border-red-500/30 group"
            >
              <span className="text-lg mr-2 group-hover:scale-110 transition-transform">🚪</span>
              <span className="font-semibold">Sair</span>
            </button>
          </div>

          {/* Version */}
          <div className="text-center">
            <p className="text-xs text-white/40 font-medium">
              v1.0.0 • © 2024 Avelar
            </p>
          </div>
        </div>
      </div>
      </aside>
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sair do sistema"
        message="Deseja realmente sair do sistema?"
        confirmLabel="Sair"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false)
          clearAuth()
          window.location.href = 'https://app.avelarcompany.com.br/login'
        }}
      />
    </>
  )
}
