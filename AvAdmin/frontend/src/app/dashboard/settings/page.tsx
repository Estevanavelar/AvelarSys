'use client'

import React, { useState, useEffect } from 'react'
import { getToken, getUser } from '@/lib/auth'

interface Settings {
  system_name: string
  system_email: string
  whatsapp_enabled: boolean
  whatsapp_provider: string
  jwt_expire_days: number
  max_users_per_account: number
  max_products_per_account: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    system_name: 'Avelar System',
    system_email: 'contato@avelarcompany.com.br',
    whatsapp_enabled: true,
    whatsapp_provider: 'wppconnect',
    jwt_expire_days: 7,
    max_users_per_account: 50,
    max_products_per_account: 1000
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const user = getUser()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      // Mock settings - API será implementada depois
      setSettings(settings)
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Configurações do Sistema</h1>
          <p className="text-gray-600">Gerencie as configurações gerais do AvAdmin</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              <span className="text-xl mr-3">{message.type === 'success' ? '✅' : '❌'}</span>
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">⚙️</span>
            Configurações Gerais
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome do Sistema
              </label>
              <input
                type="text"
                value={settings.system_name}
                onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                className="input-modern"
                placeholder="Nome do sistema"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-mail do Sistema
              </label>
              <input
                type="email"
                value={settings.system_email}
                onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
                className="input-modern"
                placeholder="contato@avelarcompany.com.br"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Expiração do Token JWT (dias)
              </label>
              <input
                type="number"
                value={settings.jwt_expire_days}
                onChange={(e) => setSettings({ ...settings, jwt_expire_days: parseInt(e.target.value) })}
                className="input-modern"
                min="1"
                max="365"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Settings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">📱</span>
            Configurações WhatsApp
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Habilitar WhatsApp
                </label>
                <p className="text-sm text-gray-600">Ativar integração com WhatsApp</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp_enabled}
                  onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {settings.whatsapp_enabled && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Provedor WhatsApp
                </label>
                <select
                  value={settings.whatsapp_provider}
                  onChange={(e) => setSettings({ ...settings, whatsapp_provider: e.target.value })}
                  className="input-modern"
                >
                  <option value="wppconnect">WPPConnect (Recomendado)</option>
                  <option value="business_api">Meta Business API</option>
                  <option value="development">Desenvolvimento (Simulação)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Limits Settings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Limites do Sistema
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Máximo de Usuários por Conta
              </label>
              <input
                type="number"
                value={settings.max_users_per_account}
                onChange={(e) => setSettings({ ...settings, max_users_per_account: parseInt(e.target.value) })}
                className="input-modern"
                min="1"
                max="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Máximo de Produtos por Conta
              </label>
              <input
                type="number"
                value={settings.max_products_per_account}
                onChange={(e) => setSettings({ ...settings, max_products_per_account: parseInt(e.target.value) })}
                className="input-modern"
                min="1"
                max="100000"
              />
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">👤</span>
            Informações do Usuário
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">Nome</p>
                <p className="text-gray-600">{user?.full_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">CPF</p>
                <p className="text-gray-600">{user?.cpf || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">Perfil</p>
                <p className="text-gray-600 capitalize">{user?.role?.replace('_', ' ') || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-6 flex items-center">
            <span className="mr-3">⚠️</span>
            Zona de Perigo
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2">Limpar Cache do Sistema</h3>
              <p className="text-sm text-red-700 mb-4">
                Isso irá limpar todos os caches do sistema. Use com cuidado.
              </p>
              <button className="btn-danger text-sm">
                Limpar Cache
              </button>
            </div>

            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2">Resetar Configurações</h3>
              <p className="text-sm text-red-700 mb-4">
                Restaura todas as configurações para os valores padrão.
              </p>
              <button className="btn-danger text-sm">
                Resetar Configurações
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary min-w-[200px] flex items-center justify-center"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

