'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import { getApiUrl } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog'

interface WhatsAppStatus {
  provider: string
  configured: boolean
  connected: boolean
  qr_available: boolean
  session_name: string
  uptime?: number
}

interface Provider {
  id: string
  name: string
  configured: boolean
  description: string
  icon: string
}

interface WPPConnectStatus {
  service: string
  status: string
  qrCode?: string
  lastUpdate: string
  sessionName: string
  uptime: number
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [wppStatus, setWppStatus] = useState<WPPConnectStatus | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQR, setLoadingQR] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Avelar System. 🚀')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [changingProvider, setChangingProvider] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const API_URL = getApiUrl()

  // Fetch WPPConnect status via proxy (avoids CORS/mixed content issues)
  const fetchWPPConnectStatus = useCallback(async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/wppconnect/proxy/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data: WPPConnectStatus = await response.json()
        setWppStatus(data)
        
        // Update main status based on WPPConnect
        setStatus({
          provider: 'wppconnect',
          configured: true,
          connected: data.status === 'connected',
          qr_available: data.status === 'waiting_scan',
          session_name: data.sessionName
        })

        // Auto-load QR if waiting scan
        if (data.status === 'waiting_scan' && data.qrCode) {
          setQrCode(data.qrCode)
        } else if (data.status === 'connected') {
          setQrCode(null)
        }
      }
    } catch (error) {
      console.error('Error fetching WPPConnect status:', error)
    }
  }, [API_URL])

  // Fetch AvAdmin WhatsApp status
  const fetchStatus = useCallback(async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (response.ok) {
        const data = await response.json()
        
        setProviders([
          {
            id: 'wppconnect',
            name: 'WPPConnect',
            configured: data.providers?.wppconnect?.configured || wppStatus?.status !== 'disconnected',
            description: 'WhatsApp via QR Code (Recomendado)',
            icon: '📱'
          },
          {
            id: 'business_api',
            name: 'Meta Business API',
            configured: data.providers?.business_api?.configured || false,
            description: 'API oficial do WhatsApp Business',
            icon: '🏢'
          },
          {
            id: 'development',
            name: 'Simulação (Dev)',
            configured: true,
            description: 'Simula envio para testes',
            icon: '🧪'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching AvAdmin status:', error)
    } finally {
      setLoading(false)
    }
  }, [API_URL, wppStatus?.status])

  useEffect(() => {
    fetchWPPConnectStatus()
    fetchStatus()
    
    // Poll WPPConnect status every 5 seconds
    const interval = setInterval(fetchWPPConnectStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchWPPConnectStatus, fetchStatus])

  const loadQRCode = async () => {
    setLoadingQR(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/wppconnect/proxy/qrcode`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()

      if (data.qrcode || data.qrCode) {
        setQrCode(data.qrcode || data.qrCode)
        setTestResult(null)
      } else if (data.status === 'connected') {
        setQrCode(null)
        setTestResult({ success: true, message: '✅ WhatsApp já está conectado!' })
      } else {
        const msg = data.message || 'QR Code não disponível. Aguarde ou reinicie o servidor.'
        setQrCode(null)
        setTestResult({ success: false, message: msg })
      }
    } catch (error: any) {
      console.error('Error loading QR:', error)
      setTestResult({ success: false, message: 'Erro ao carregar QR Code. Verifique se o WPPConnect está rodando.' })
    } finally {
      setLoadingQR(false)
    }
  }

  const changeProvider = async (providerId: string) => {
    setChangingProvider(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/provider/change`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ provider: providerId })
      })

      if (response.ok) {
        setTestResult({ success: true, message: `Provedor alterado para ${providerId}` })
        fetchStatus()
      } else {
        const error = await response.json()
        setTestResult({ success: false, message: error.detail || 'Erro ao alterar provedor' })
      }
    } catch (error: any) {
      setTestResult({ success: false, message: 'Erro de conexão' })
    } finally {
      setChangingProvider(false)
    }
  }

  const restartWPPConnect = async () => {
    setRestarting(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/wppconnect/proxy/restart`, { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (response.ok) {
        setTestResult({ success: true, message: 'WPPConnect reiniciando... Aguarde o QR Code.' })
        setQrCode(null)
        setTimeout(fetchWPPConnectStatus, 3000)
      } else {
        setTestResult({ success: false, message: 'Erro ao reiniciar WPPConnect' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro de conexão com WPPConnect' })
    } finally {
      setRestarting(false)
    }
  }

  const disconnectWPPConnect = () => {
    setShowDisconnectConfirm(true)
  }

  const confirmDisconnect = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/whatsapp/wppconnect/proxy/restart`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (response.ok) {
        setTestResult({ success: true, message: 'WhatsApp desconectado' })
        setQrCode(null)
        fetchWPPConnectStatus()
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao desconectar' })
    } finally {
      setShowDisconnectConfirm(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  const sendTestMessage = async () => {
    if (!testPhone) {
      setTestResult({ success: false, message: 'Digite um número de telefone' })
      return
    }

    setSendingTest(true)
    setTestResult(null)

    try {
      // Send via proxy - sempre adicionar 55 (Brasil) se não tiver
      let phoneNumbers = testPhone.replace(/\D/g, '')
      if (!phoneNumbers.startsWith('55')) {
        phoneNumbers = '55' + phoneNumbers
      }
      const token = getToken()
      
      const response = await fetch(`${API_URL}/api/whatsapp/wppconnect/proxy/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          phone: phoneNumbers,
          message: testMessage
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTestResult({ success: true, message: `✅ Mensagem enviada para ${testPhone}!` })
      } else {
        setTestResult({ success: false, message: data.error || 'Erro ao enviar mensagem' })
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Erro de conexão' })
    } finally {
      setSendingTest(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Conectando ao WhatsApp...</p>
          </div>
        </div>
      </div>
    )
  }

  const isConnected = wppStatus?.status === 'connected'
  const isWaitingScan = wppStatus?.status === 'waiting_scan'

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center">
          <span className="mr-3 text-5xl">📱</span>
          Configuração WhatsApp
        </h1>
        <p className="text-gray-600 mt-2">Gerencie a integração com WhatsApp via WPPConnect</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">📊</span>
                Status da Conexão
              </h2>
            </div>

            <div className="p-6">
              {/* Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-xl text-center transition-all ${isConnected ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${isConnected ? 'bg-green-500 animate-pulse' : isWaitingScan ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className={`font-bold ${isConnected ? 'text-green-600' : isWaitingScan ? 'text-yellow-600' : 'text-red-600'}`}>
                    {isConnected ? 'Conectado' : isWaitingScan ? 'Aguardando Scan' : 'Desconectado'}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-1">🔌</div>
                  <p className="text-sm font-medium text-gray-600">Provedor</p>
                  <p className="font-bold text-gray-900">WPPConnect</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-1">📝</div>
                  <p className="text-sm font-medium text-gray-600">Sessão</p>
                  <p className="font-bold text-gray-900">{wppStatus?.sessionName || 'avelar-session'}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-1">⏱️</div>
                  <p className="text-sm font-medium text-gray-600">Uptime</p>
                  <p className="font-bold text-gray-900">{wppStatus?.uptime ? formatUptime(wppStatus.uptime) : 'N/A'}</p>
                </div>
              </div>

              {/* QR Code Section */}
              {!isConnected && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gradient-to-br from-gray-50 to-white">
                  {qrCode ? (
                    <div className="animate-fade-in">
                      <p className="text-lg font-medium text-gray-700 mb-4">📲 Escaneie o QR Code com seu WhatsApp</p>
                      <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="w-64 h-64 rounded-lg"
                        />
                      </div>
                      <div className="mt-4 flex justify-center space-x-3">
                        <button
                          onClick={loadQRCode}
                          disabled={loadingQR}
                          className="text-green-600 hover:text-green-700 font-medium flex items-center space-x-1 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          {loadingQR ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span>🔄</span>
                          )}
                          <span>Atualizar QR</span>
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        Última atualização: {wppStatus?.lastUpdate ? new Date(wppStatus.lastUpdate).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-7xl mb-4">📲</div>
                      <p className="text-xl font-medium text-gray-700 mb-2">WhatsApp não conectado</p>
                      <p className="text-gray-500 mb-6">Clique no botão abaixo para gerar o QR Code</p>
                      <button
                        onClick={loadQRCode}
                        disabled={loadingQR}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
                      >
                        {loadingQR ? (
                          <>
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Carregando QR Code...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl">📱</span>
                            <span>Gerar QR Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Connected State */}
              {isConnected && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center">
                  <div className="text-7xl mb-4">✅</div>
                  <p className="text-2xl font-bold text-green-800 mb-2">WhatsApp Conectado!</p>
                  <p className="text-green-600 mb-6">O sistema está pronto para enviar mensagens</p>
                  <button
                    onClick={disconnectWPPConnect}
                    className="text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    🔌 Desconectar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Test Message Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">🧪</span>
                Testar Envio de Mensagem
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone (com DDD)</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mensagem</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                />
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border-2 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-fade-in`}>
                  <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </p>
                </div>
              )}

              <button
                onClick={sendTestMessage}
                disabled={sendingTest || !testPhone || !isConnected}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
              >
                {sendingTest ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">📤</span>
                    <span>Enviar Mensagem de Teste</span>
                  </>
                )}
              </button>
              
              {!isConnected && (
                <p className="text-center text-sm text-yellow-600 bg-yellow-50 rounded-lg p-2">
                  ⚠️ Conecte o WhatsApp primeiro para enviar mensagens
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Providers Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔌</span>
                Provedores
              </h2>
            </div>

            <div className="p-4 space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => !changingProvider && changeProvider(provider.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    status?.provider === provider.id || (provider.id === 'wppconnect' && !status?.provider)
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{provider.name}</p>
                        <p className="text-xs text-gray-500">{provider.description}</p>
                      </div>
                    </div>
                    {(status?.provider === provider.id || (provider.id === 'wppconnect' && !status?.provider)) && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">Ativo</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <span className={`w-2 h-2 rounded-full mr-2 ${provider.configured ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className={provider.configured ? 'text-green-600' : 'text-gray-400'}>
                      {provider.configured ? 'Configurado' : 'Não configurado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">⚡</span>
                Ações Rápidas
              </h2>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={restartWPPConnect}
                disabled={restarting}
                className="w-full p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors text-left flex items-center space-x-3"
              >
                {restarting ? (
                  <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-xl">🔄</span>
                )}
                <span className="font-medium text-yellow-700">Reiniciar WPPConnect</span>
              </button>
              
              <button
                onClick={fetchWPPConnectStatus}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left flex items-center space-x-3"
              >
                <span className="text-xl">📊</span>
                <span className="font-medium text-blue-700">Atualizar Status</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔗</span>
                Links Rápidos
              </h2>
            </div>

            <div className="p-4 space-y-2">
              <a
                href={`${API_URL}/api/whatsapp/wppconnect/proxy/status`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">📊 API Status (Proxy)</span>
              </a>
              <a
                href={`${API_URL}/api/whatsapp/wppconnect/proxy/qrcode`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">📱 QR Code JSON (Proxy)</span>
              </a>
              <a
                href={`${API_URL}/api/whatsapp/status`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">📨 WhatsApp Status</span>
              </a>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <span className="mr-2">💡</span>
              Dica
            </h3>
            <p className="text-sm opacity-90 leading-relaxed">
              O WPPConnect funciona com seu próprio WhatsApp. Para produção em larga escala com números comerciais, considere a API oficial do WhatsApp Business.
            </p>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showDisconnectConfirm}
        title="Desconectar WhatsApp"
        message="Deseja realmente desconectar o WhatsApp?"
        confirmLabel="Desconectar"
        onCancel={() => setShowDisconnectConfirm(false)}
        onConfirm={confirmDisconnect}
      />
    </div>
  )
}
