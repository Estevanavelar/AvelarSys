'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Account {
  id: string
  company_name: string
  cnpj: string
  whatsapp: string
  responsible_name?: string
  status: string
  plan_name?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  created_at: string
}

interface FormData {
  company_name: string
  cnpj: string
  whatsapp: string
  responsible_name: string
  status: string
  address: string
  city: string
  state: string
  zip_code: string
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmTitle, setConfirmTitle] = useState('Confirmar ação')
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const limit = 20

  const openConfirm = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setConfirmAction(() => action)
    setConfirmOpen(true)
  }

  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    cnpj: '',
    whatsapp: '',
    responsible_name: '',
    status: 'trial',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  })

  useEffect(() => {
    fetchAccounts()
  }, [page, statusFilter])

  const fetchAccounts = async () => {
    try {
      const token = getToken()
      const params = new URLSearchParams({ skip: String((page - 1) * limit), limit: String(limit) })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)

      const res = await fetch(`https://avadmin.avelarcompany.com.br/api/accounts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setAccounts(data.accounts || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
      // Mock data
      setAccounts([
        { id: '1', company_name: 'Avelar Company', cnpj: '12345678000100', whatsapp: '+5511999999999', status: 'active', created_at: '2024-01-01' },
        { id: '2', company_name: 'TechStore LTDA', cnpj: '98765432000111', whatsapp: '+5511888888888', status: 'trial', created_at: '2024-01-15' }
      ])
      setTotal(2)
    } finally {
      setLoading(false)
    }
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 14)
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Nome da empresa é obrigatório'
    } else if (formData.company_name.length < 3) {
      newErrors.company_name = 'Nome deve ter pelo menos 3 caracteres'
    }

    const cnpjNumbers = formData.cnpj.replace(/\D/g, '')
    if (!cnpjNumbers) {
      newErrors.cnpj = 'CNPJ é obrigatório'
    } else if (cnpjNumbers.length !== 14) {
      newErrors.cnpj = 'CNPJ deve ter 14 dígitos'
    }

    const phoneNumbers = formData.whatsapp.replace(/\D/g, '')
    if (!phoneNumbers) {
      newErrors.whatsapp = 'WhatsApp é obrigatório'
    } else if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.whatsapp = 'WhatsApp inválido'
    }

    if (!formData.responsible_name.trim()) {
      newErrors.responsible_name = 'Nome do responsável é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const token = getToken()
      const payload = {
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        whatsapp: '+55' + formData.whatsapp.replace(/\D/g, ''),
        zip_code: formData.zip_code.replace(/\D/g, '')
      }

      const url = selectedAccount 
        ? `https://avadmin.avelarcompany.com.br/api/accounts/${selectedAccount.id}`
        : 'https://avadmin.avelarcompany.com.br/api/accounts'

      const res = await fetch(url, {
        method: selectedAccount ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Erro ao salvar')
      }

      setShowModal(false)
      setSelectedAccount(null)
      resetForm()
      fetchAccounts()
    } catch (error) {
      toast.error('Erro: ' + (error as Error).message, { duration: 5000 })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      company_name: '',
      cnpj: '',
      whatsapp: '',
      responsible_name: '',
      status: 'trial',
      address: '',
      city: '',
      state: '',
      zip_code: ''
    })
    setErrors({})
  }

  const openEditModal = (account: Account) => {
    setSelectedAccount(account)
    setFormData({
      company_name: account.company_name,
      cnpj: formatCNPJ(account.cnpj),
      whatsapp: formatPhone(account.whatsapp.replace('+55', '')),
      responsible_name: account.responsible_name || '',
      status: account.status,
      address: account.address || '',
      city: account.city || '',
      state: account.state || '',
      zip_code: account.zip_code ? formatCEP(account.zip_code) : ''
    })
    setShowModal(true)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      active: { label: 'Ativa', className: 'bg-green-100 text-green-700 border-green-300' },
      suspended: { label: 'Suspensa', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700 border-red-300' },
      trial: { label: 'Trial', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      pending: { label: 'Pendente', className: 'bg-gray-100 text-gray-700 border-gray-300' }
    }
    const c = config[status] || config.pending
    return <span className={`badge ${c.className} px-3 py-1 rounded-full text-xs font-semibold border`}>{c.label}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Contas</h1>
          <p className="text-gray-600">Gerencie todas as contas e empresas do sistema</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAccounts()}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspensas</option>
              <option value="cancelled">Canceladas</option>
            </select>

            <button onClick={() => { resetForm(); setSelectedAccount(null); setShowModal(true) }} className="btn-primary flex items-center space-x-2 whitespace-nowrap">
              <span>➕</span>
              <span>Nova Conta</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Contas</p>
                <p className="text-3xl font-bold text-gray-900">{total}</p>
              </div>
              <div className="stat-card-icon bg-blue-500/10 text-blue-600">🏢</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contas Ativas</p>
                <p className="text-3xl font-bold text-green-600">{accounts.filter(a => a.status === 'active').length}</p>
              </div>
              <div className="stat-card-icon bg-green-500/10 text-green-600">✅</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Em Trial</p>
                <p className="text-3xl font-bold text-blue-600">{accounts.filter(a => a.status === 'trial').length}</p>
              </div>
              <div className="stat-card-icon bg-blue-500/10 text-blue-600">⏱️</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Suspensas</p>
                <p className="text-3xl font-bold text-yellow-600">{accounts.filter(a => a.status === 'suspended').length}</p>
              </div>
              <div className="stat-card-icon bg-yellow-500/10 text-yellow-600">⚠️</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Empresa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">CNPJ</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">WhatsApp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600">Nenhuma conta encontrada</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{account.company_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-sm">{formatCNPJ(account.cnpj)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatPhone(account.whatsapp.replace('+55', ''))}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(account.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => openEditModal(account)} className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-lg transition-colors" title="Editar">✏️</button>
                          <button
                            onClick={() => {
                              openConfirm(
                                account.status === 'suspended' ? 'Ativar conta' : 'Suspender conta',
                                `Deseja ${account.status === 'suspended' ? 'ativar' : 'suspender'} esta conta?`,
                                async () => {
                                  const token = getToken()
                                  await fetch(`https://avadmin.avelarcompany.com.br/api/accounts/${account.id}/${account.status === 'suspended' ? 'activate' : 'suspend'}`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  })
                                  fetchAccounts()
                                }
                              )
                            }}
                            className="text-yellow-600 hover:text-yellow-700 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                            title={account.status === 'suspended' ? 'Ativar' : 'Suspender'}
                          >
                            {account.status === 'suspended' ? '✅' : '⏸️'}
                          </button>
                          <button
                            onClick={() => {
                              openConfirm(
                                'Deletar conta',
                                'Deseja realmente deletar esta conta?',
                                async () => {
                                  const token = getToken()
                                  await fetch(`https://avadmin.avelarcompany.com.br/api/accounts/${account.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  })
                                  fetchAccounts()
                                }
                              )
                            }}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-xl p-4">
            <p className="text-sm text-gray-600">Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total}</p>
            <div className="flex space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-4 py-2 border rounded-lg disabled:opacity-50">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedAccount ? 'Editar Conta' : 'Nova Conta'}</h2>
                <button onClick={() => { setShowModal(false); setSelectedAccount(null); resetForm() }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">🏢</span>Dados da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Nome da Empresa *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.company_name ? 'border-red-500' : ''}`}
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Ex: Minha Empresa LTDA"
                    />
                    {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">CNPJ *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.cnpj ? 'border-red-500' : ''}`}
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                      placeholder="00.000.000/0000-00"
                    />
                    {errors.cnpj && <p className="text-red-500 text-xs mt-1">{errors.cnpj}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Responsável *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.responsible_name ? 'border-red-500' : ''}`}
                      value={formData.responsible_name}
                      onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                      placeholder="Nome do responsável legal"
                    />
                    {errors.responsible_name && <p className="text-red-500 text-xs mt-1">{errors.responsible_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">WhatsApp *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.whatsapp ? 'border-red-500' : ''}`}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                      placeholder="(11) 99999-9999"
                    />
                    {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">📍</span>Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Endereço</label>
                    <input type="text" className="input-modern" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, número, complemento" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">CEP</label>
                    <input type="text" className="input-modern" value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: formatCEP(e.target.value) })} placeholder="00000-000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Cidade</label>
                    <input type="text" className="input-modern" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="São Paulo" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Estado</label>
                    <select className="input-modern" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}>
                      <option value="">Selecione</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Config */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">⚙️</span>Configurações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Status</label>
                    <select className="input-modern" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="trial">Trial</option>
                      <option value="active">Ativa</option>
                      <option value="suspended">Suspensa</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4 sticky bottom-0 bg-white">
              <button onClick={() => { setShowModal(false); setSelectedAccount(null); resetForm() }} className="btn-secondary">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : (selectedAccount ? 'Atualizar' : 'Criar')}
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
