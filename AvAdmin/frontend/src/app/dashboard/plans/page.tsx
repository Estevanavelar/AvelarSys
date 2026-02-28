'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_products: number
  max_transactions: number
  features: string[]
  modules: string[]
  is_active: boolean
  is_popular: boolean
  trial_days: number
  billing_cycle: 'monthly' | 'yearly' | 'lifetime'
  subscribers: number
  created_at: string
  color?: string
}

const FEATURE_LABELS: Record<string, string> = {
  whatsapp_integration: 'Integração WhatsApp',
  api_access: 'Acesso via API',
  custom_branding: 'Marca Personalizada',
  priority_support: 'Suporte Prioritário',
  advanced_analytics: 'Análise Avançada',
  export_data: 'Exportação de Dados',
  multi_location: 'Multi-localização',
  modules: 'Módulos Adicionais'
}

interface PlanStats {
  total_subscribers: number
  total_mrr: number
  active_plans: number
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<PlanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmTitle, setConfirmTitle] = useState('Confirmar ação')
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 1,
    max_products: 100,
    max_transactions: 500,
    features: '',
    modules: '',
    is_active: true,
    is_popular: false,
    trial_days: 14
  })

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://avadmin.avelarcompany.com.br'
      const res = await fetch(`${apiUrl}/api/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`)
      }
      
      const data = await res.json()
      setPlans(data.plans || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Erro ao buscar planos:', error)
      toast.error('Não foi possível carregar os planos do servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleSubmit = async () => {
    try {
      const token = getToken()
      const payload = {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        modules: formData.modules.split(',').map(m => m.trim()).filter(Boolean)
      }

      const url = selectedPlan 
        ? `https://avadmin.avelarcompany.com.br/api/plans/${selectedPlan.id}`
        : 'https://avadmin.avelarcompany.com.br/api/plans'
      
      const res = await fetch(url, {
        method: selectedPlan ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Erro ao salvar plano')

      setShowModal(false)
      setSelectedPlan(null)
      resetForm()
      fetchPlans()
    } catch (error) {
      toast.error('Erro: ' + (error as Error).message, { duration: 5000 })
    }
  }

  const handleDelete = async (planId: string) => {
    setConfirmTitle('Desativar plano')
    setConfirmMessage('Deseja realmente desativar este plano?')
    setConfirmAction(() => async () => {
      const token = getToken()
      await fetch(`https://avadmin.avelarcompany.com.br/api/plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchPlans()
    })
    setConfirmOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_users: 1,
      max_products: 100,
      max_transactions: 500,
      features: '',
      modules: '',
      is_active: true,
      is_popular: false,
      trial_days: 14
    })
  }

  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_users: plan.max_users,
      max_products: plan.max_products,
      max_transactions: plan.max_transactions,
      features: plan.features.join(', '),
      modules: plan.modules.join(', '),
      is_active: plan.is_active,
      is_popular: plan.is_popular,
      trial_days: plan.trial_days
    })
    setShowModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Planos</h1>
            <p className="text-gray-600">Configure os planos e preços do SaaS</p>
          </div>
          <button
            onClick={() => { resetForm(); setSelectedPlan(null); setShowModal(true) }}
            className="btn-primary flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Novo Plano</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Assinantes Totais</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_subscribers || 0}</p>
              </div>
              <div className="stat-card-icon bg-blue-500/10 text-blue-600">👥</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">MRR (Receita Mensal)</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats?.total_mrr || 0)}</p>
              </div>
              <div className="stat-card-icon bg-green-500/10 text-green-600">💰</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Planos Ativos</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.active_plans || 0}</p>
              </div>
              <div className="stat-card-icon bg-purple-500/10 text-purple-600">📋</div>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
                plan.is_popular ? 'ring-2 ring-primary-500/20' : ''
              }`}
              style={{ borderColor: plan.is_popular ? (plan.color || '#3B82F6') : '#E5E7EB' }}
            >
              {plan.is_popular && (
                <div 
                  className="text-white text-center py-2 text-sm font-semibold"
                  style={{ backgroundColor: plan.color || '#3B82F6' }}
                >
                  ⭐ Mais Popular
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  {!plan.is_active && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">Inativo</span>
                  )}
                </div>

                <p className="text-gray-600 mb-4">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price_monthly === 0 ? 'Grátis' : formatCurrency(plan.price_monthly)}
                    </span>
                    {plan.billing_cycle !== 'lifetime' && (
                      <span className="text-gray-500 ml-2">/mês</span>
                    )}
                    {plan.billing_cycle === 'lifetime' && (
                      <span className="text-gray-500 ml-2">vitalício</span>
                    )}
                  </div>
                  {plan.billing_cycle !== 'lifetime' && plan.price_yearly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ou {formatCurrency(plan.price_yearly)}/ano
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm">
                    <span className="w-6">👤</span>
                    <span className="text-gray-700">{plan.max_users === 999 ? 'Ilimitado' : plan.max_users} usuários</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="w-6">📦</span>
                    <span className="text-gray-700">{plan.max_products === 99999 ? 'Ilimitado' : plan.max_products.toLocaleString()} produtos</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="w-6">💳</span>
                    <span className="text-gray-700">{plan.max_transactions === 999999 ? 'Ilimitado' : plan.max_transactions.toLocaleString()} transações/mês</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="w-6">⏱️</span>
                    <span className="text-gray-700">{plan.trial_days} dias de trial</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recursos</p>
                  <ul className="space-y-2">
                    {plan.features.filter(f => f !== 'modules').slice(0, 6).map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <span className="text-green-500 mr-2">✓</span>
                        {FEATURE_LABELS[feature] || feature}
                      </li>
                    ))}
                    {plan.features.length > 6 && (
                      <li className="text-sm text-primary-600">+{plan.features.length - 6} mais...</li>
                    )}
                  </ul>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Módulos</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.modules.map((module) => (
                      <span key={module} className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 -mx-6 -mb-6 p-4 mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    <strong>{plan.subscribers}</strong> assinantes
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desativar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedPlan ? 'Editar Plano' : 'Novo Plano'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome do Plano *</label>
                  <input
                    type="text"
                    className="input-modern"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Business"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Dias de Trial</label>
                  <input
                    type="number"
                    className="input-modern"
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Descrição</label>
                <input
                  type="text"
                  className="input-modern"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Para empresas em crescimento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Preço Mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-modern"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Preço Anual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-modern"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Máx. Usuários</label>
                  <input
                    type="number"
                    className="input-modern"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Máx. Produtos</label>
                  <input
                    type="number"
                    className="input-modern"
                    value={formData.max_products}
                    onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Máx. Transações</label>
                  <input
                    type="number"
                    className="input-modern"
                    value={formData.max_transactions}
                    onChange={(e) => setFormData({ ...formData, max_transactions: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Recursos (separados por vírgula)</label>
                <textarea
                  className="input-modern"
                  rows={3}
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Suporte prioritário, Dashboard avançado, API access"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Módulos (separados por vírgula)</label>
                <input
                  type="text"
                  className="input-modern"
                  value={formData.modules}
                  onChange={(e) => setFormData({ ...formData, modules: e.target.value })}
                  placeholder="StockTech, AvAdmin, Reports"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium">Ativo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_popular}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium">Destacar como Popular</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => { setShowModal(false); setSelectedPlan(null); resetForm() }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handleSubmit} className="btn-primary">
                {selectedPlan ? 'Atualizar' : 'Criar'} Plano
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Confirmar"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (confirmAction) {
            await confirmAction()
          }
          setConfirmOpen(false)
        }}
      />
    </div>
  )
}

