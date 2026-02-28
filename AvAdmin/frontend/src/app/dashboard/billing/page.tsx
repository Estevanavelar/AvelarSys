'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import { toast } from 'sonner'

interface Invoice {
  id: string
  account_id: string
  account_name: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  description: string
  due_date: string
  paid_at?: string
  payment_method?: string
  created_at: string
}

interface Transaction {
  id: string
  invoice_id: string
  account_name: string
  amount: number
  type: string
  method: string
  status: string
  created_at: string
}

interface BillingStats {
  total_pending: number
  total_paid: number
  total_overdue: number
  pending_count: number
  paid_count: number
  overdue_count: number
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('pix')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const token = getToken()
      
      // Fetch invoices
      const invRes = await fetch(`https://avadmin.avelarcompany.com.br/api/billing/invoices${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const invData = await invRes.json()
      setInvoices(invData.invoices || [])
      setStats(invData.stats || null)

      // Fetch transactions
      const txnRes = await fetch('https://avadmin.avelarcompany.com.br/api/billing/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const txnData = await txnRes.json()
      setTransactions(txnData.transactions || [])

    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      // Mock data
      setInvoices([
        {
          id: 'inv-001',
          account_id: 'acc-001',
          account_name: 'Avelar Company',
          amount: 149.90,
          status: 'paid',
          description: 'Plano Business - Janeiro 2024',
          due_date: '2024-01-15',
          paid_at: '2024-01-10T14:30:00Z',
          payment_method: 'pix',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'inv-002',
          account_id: 'acc-002',
          account_name: 'TechStore LTDA',
          amount: 49.90,
          status: 'pending',
          description: 'Plano Starter - Janeiro 2024',
          due_date: '2024-01-20',
          created_at: '2024-01-05T00:00:00Z'
        },
        {
          id: 'inv-003',
          account_id: 'acc-003',
          account_name: 'Eletrônicos Brasil',
          amount: 499.90,
          status: 'overdue',
          description: 'Plano Enterprise - Dezembro 2023',
          due_date: '2023-12-15',
          created_at: '2023-12-01T00:00:00Z'
        }
      ])
      setStats({
        total_pending: 49.90,
        total_paid: 149.90,
        total_overdue: 499.90,
        pending_count: 1,
        paid_count: 1,
        overdue_count: 1
      })
      setTransactions([
        {
          id: 'txn-001',
          invoice_id: 'inv-001',
          account_name: 'Avelar Company',
          amount: 149.90,
          type: 'payment',
          method: 'pix',
          status: 'completed',
          created_at: '2024-01-10T14:30:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkPaid = async () => {
    if (!selectedInvoice) return

    try {
      const token = getToken()
      await fetch(`https://avadmin.avelarcompany.com.br/api/billing/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          method: paymentMethod,
          amount: selectedInvoice.amount
        })
      })
      setShowPayModal(false)
      setSelectedInvoice(null)
      fetchData()
    } catch (error) {
      toast.error('Erro ao marcar como pago: ' + (error as Error).message, { duration: 5000 })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      paid: { label: 'Pago', className: 'bg-green-100 text-green-700 border-green-300' },
      overdue: { label: 'Vencida', className: 'bg-red-100 text-red-700 border-red-300' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-700 border-gray-300' }
    }
    const c = config[status] || config.pending
    return (
      <span className={`badge ${c.className} px-3 py-1 rounded-full text-xs font-semibold border`}>
        {c.label}
      </span>
    )
  }

  const getPaymentMethodIcon = (method?: string) => {
    const icons: Record<string, string> = {
      pix: '🏦',
      credit_card: '💳',
      boleto: '📄'
    }
    return icons[method || ''] || '💰'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando faturamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Faturamento</h1>
          <p className="text-gray-600">Gerencie faturas e transações financeiras</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pago</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats?.total_paid || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.paid_count || 0} faturas</p>
              </div>
              <div className="stat-card-icon bg-green-500/10 text-green-600">✅</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pendente</p>
                <p className="text-3xl font-bold text-yellow-600">{formatCurrency(stats?.total_pending || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.pending_count || 0} faturas</p>
              </div>
              <div className="stat-card-icon bg-yellow-500/10 text-yellow-600">⏳</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Vencidas</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats?.total_overdue || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.overdue_count || 0} faturas</p>
              </div>
              <div className="stat-card-icon bg-red-500/10 text-red-600">⚠️</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">MRR</p>
                <p className="text-3xl font-bold text-primary-600">{formatCurrency(15680.50)}</p>
                <p className="text-xs text-green-500 mt-1">↑ 12.5% vs mês anterior</p>
              </div>
              <div className="stat-card-icon bg-primary-500/10 text-primary-600">📈</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                  activeTab === 'invoices'
                    ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Faturas
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                  activeTab === 'transactions'
                    ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💳 Transações
              </button>
            </div>
          </div>

          {activeTab === 'invoices' && (
            <>
              {/* Filters */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagas</option>
                    <option value="overdue">Vencidas</option>
                  </select>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Vencimento</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <p className="text-gray-600">Nenhuma fatura encontrada</p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm text-gray-600">{invoice.id}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{invoice.account_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600 text-sm">{invoice.description}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {formatDate(invoice.due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.status === 'pending' || invoice.status === 'overdue' ? (
                              <button
                                onClick={() => { setSelectedInvoice(invoice); setShowPayModal(true) }}
                                className="text-green-600 hover:text-green-700 px-3 py-1 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                ✓ Marcar Pago
                              </button>
                            ) : invoice.status === 'paid' && (
                              <span className="text-sm text-gray-500 flex items-center">
                                {getPaymentMethodIcon(invoice.payment_method)}
                                <span className="ml-1">{invoice.payment_method?.toUpperCase()}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Fatura</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className="text-gray-600">Nenhuma transação encontrada</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-gray-600">{txn.id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{txn.account_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-primary-600">{txn.invoice_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-green-600">+{formatCurrency(txn.amount)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center">
                            {getPaymentMethodIcon(txn.method)}
                            <span className="ml-2 text-sm text-gray-600">{txn.method?.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatDate(txn.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge bg-green-100 text-green-700 border border-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                            Concluído
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Registrar Pagamento</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Fatura</p>
                <p className="font-semibold text-gray-900">{selectedInvoice.id}</p>
                <p className="text-sm text-gray-600 mt-2">{selectedInvoice.description}</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">{formatCurrency(selectedInvoice.amount)}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Método de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-modern"
                >
                  <option value="pix">🏦 PIX</option>
                  <option value="credit_card">💳 Cartão de Crédito</option>
                  <option value="boleto">📄 Boleto</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => { setShowPayModal(false); setSelectedInvoice(null) }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handleMarkPaid} className="btn-primary">
                ✓ Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

