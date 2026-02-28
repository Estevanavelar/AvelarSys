'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getToken } from '@/lib/auth'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface User {
  id: string
  full_name: string
  cpf: string
  whatsapp: string
  role: string
  is_active: boolean
  whatsapp_verified: boolean
  client_type?: string
  enabled_modules?: string[]
  account_id?: string
  created_at: string
}

interface FormData {
  full_name: string
  cpf: string
  whatsapp: string
  password: string
  confirm_password: string
  role: string
  is_active: boolean
  birth_date: string
  client_type: string
  enabled_modules: string[]
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'purple' },
  { value: 'admin', label: 'Administrador', color: 'blue' },
  { value: 'manager', label: 'Gerente', color: 'green' },
  { value: 'user', label: 'Usuário', color: 'gray' },
  { value: 'viewer', label: 'Visualizador', color: 'gray' }
]

const AVAILABLE_MODULES = ['StockTech', 'AvAdmin', 'Reports', 'WhatsApp', 'Integrations', 'NaldoGas']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
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
    full_name: '',
    cpf: '',
    whatsapp: '',
    password: '',
    confirm_password: '',
    role: 'user',
    is_active: true,
    birth_date: '',
    client_type: 'lojista',
    enabled_modules: []
  })

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter])

  const fetchUsers = async () => {
    try {
      const token = getToken()
      const params = new URLSearchParams({ skip: String((page - 1) * limit), limit: String(limit) })
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (searchTerm) params.append('search', searchTerm)

      const res = await fetch(`https://avadmin.avelarcompany.com.br/api/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      // Mock data
      setUsers([
        { id: '1', full_name: 'Super Admin', cpf: '00000000000', whatsapp: '+5511999999999', role: 'super_admin', is_active: true, whatsapp_verified: true, created_at: '2024-01-01' },
        { id: '2', full_name: 'João Silva', cpf: '12345678901', whatsapp: '+5511888888888', role: 'admin', is_active: true, whatsapp_verified: true, created_at: '2024-01-15' },
        { id: '3', full_name: 'Maria Santos', cpf: '98765432100', whatsapp: '+5511777777777', role: 'user', is_active: false, whatsapp_verified: false, created_at: '2024-01-20' }
      ])
      setTotal(3)
    } finally {
      setLoading(false)
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '')
    if (numbers.length !== 11) return false
    if (numbers === '00000000000') return true // Special admin CPF
    if (/^(\d)\1+$/.test(numbers)) return false
    
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i)
    let rest = (sum * 10) % 11
    if (rest === 10 || rest === 11) rest = 0
    if (rest !== parseInt(numbers[9])) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i)
    rest = (sum * 10) % 11
    if (rest === 10 || rest === 11) rest = 0
    return rest === parseInt(numbers[10])
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório'
    } else if (formData.full_name.trim().split(' ').length < 2) {
      newErrors.full_name = 'Informe nome e sobrenome'
    }

    const cpfNumbers = formData.cpf.replace(/\D/g, '')
    if (!cpfNumbers) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(cpfNumbers)) {
      newErrors.cpf = 'CPF inválido'
    }

    const phoneNumbers = formData.whatsapp.replace(/\D/g, '')
    if (!phoneNumbers) {
      newErrors.whatsapp = 'WhatsApp é obrigatório'
    } else if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.whatsapp = 'WhatsApp inválido'
    }

    if (!selectedUser) {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
      }

      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Senhas não conferem'
      }
    } else if (formData.password && formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Senhas não conferem'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const token = getToken()
      const payload: any = {
        full_name: formData.full_name,
        cpf: formData.cpf.replace(/\D/g, ''),
        whatsapp: '+55' + formData.whatsapp.replace(/\D/g, ''),
        role: formData.role,
        is_active: formData.is_active,
        client_type: formData.client_type,
        enabled_modules: formData.enabled_modules
      }

      if (formData.birth_date) payload.birth_date = formData.birth_date
      if (formData.password) payload.password = formData.password

      const url = selectedUser
        ? `https://avadmin.avelarcompany.com.br/api/users/${selectedUser.id}`
        : 'https://avadmin.avelarcompany.com.br/api/users'

      const res = await fetch(url, {
        method: selectedUser ? 'PUT' : 'POST',
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
      setSelectedUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      toast.error('Erro: ' + (error as Error).message, { duration: 5000 })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      cpf: '',
      whatsapp: '',
      password: '',
      confirm_password: '',
      role: 'user',
      is_active: true,
      birth_date: '',
      client_type: 'lojista',
      enabled_modules: []
    })
    setErrors({})
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      cpf: formatCPF(user.cpf),
      whatsapp: formatPhone(user.whatsapp.replace('+55', '')),
      password: '',
      confirm_password: '',
      role: user.role,
      is_active: user.is_active,
      birth_date: '',
      client_type: user.client_type || 'lojista',
      enabled_modules: user.enabled_modules || []
    })
    setShowModal(true)
  }

  const toggleModule = (module: string) => {
    setFormData((prev) => ({
      ...prev,
      enabled_modules: prev.enabled_modules.includes(module)
        ? prev.enabled_modules.filter(m => m !== module)
        : [...prev.enabled_modules, module]
    }))
  }

  const getRoleBadge = (role: string) => {
    const r = ROLES.find(r => r.value === role) || { label: role, color: 'gray' }
    const colors: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-300'
    }
    return <span className={`badge ${colors[r.color]} px-3 py-1 rounded-full text-xs font-semibold border`}>{r.label}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Usuários</h1>
          <p className="text-gray-600">Gerencie todos os usuários do sistema</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
              </div>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500"
            >
              <option value="all">Todos os Perfis</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            <button onClick={() => { resetForm(); setSelectedUser(null); setShowModal(true) }} className="btn-primary flex items-center space-x-2 whitespace-nowrap">
              <span>➕</span>
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900">{total}</p>
              </div>
              <div className="stat-card-icon bg-blue-500/10 text-blue-600">👥</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ativos</p>
                <p className="text-3xl font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
              </div>
              <div className="stat-card-icon bg-green-500/10 text-green-600">✅</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">WhatsApp Verificado</p>
                <p className="text-3xl font-bold text-blue-600">{users.filter(u => u.whatsapp_verified).length}</p>
              </div>
              <div className="stat-card-icon bg-blue-500/10 text-blue-600">📱</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Administradores</p>
                <p className="text-3xl font-bold text-purple-600">{users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}</p>
              </div>
              <div className="stat-card-icon bg-purple-500/10 text-purple-600">👑</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Usuário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">CPF</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">WhatsApp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Perfil</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600">Nenhum usuário encontrado</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-500">{user.whatsapp_verified ? '✅ Verificado' : '⏳ Pendente'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-sm">{formatCPF(user.cpf)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatPhone(user.whatsapp.replace('+55', ''))}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge px-3 py-1 rounded-full text-xs font-semibold border ${user.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => openEditModal(user)} className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-lg transition-colors" title="Editar">✏️</button>
                          <button
                            onClick={() => {
                              openConfirm(
                                user.is_active ? 'Desativar usuário' : 'Ativar usuário',
                                `Deseja ${user.is_active ? 'desativar' : 'ativar'} este usuário?`,
                                async () => {
                                  const token = getToken()
                                  await fetch(`https://avadmin.avelarcompany.com.br/api/users/${user.id}/${user.is_active ? 'deactivate' : 'activate'}`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  })
                                  fetchUsers()
                                }
                              )
                            }}
                            className={`${user.is_active ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'} p-2 rounded-lg transition-colors`}
                            title={user.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {user.is_active ? '⏸️' : '✅'}
                          </button>
                          <button
                            onClick={() => {
                              openConfirm(
                                'Deletar usuário',
                                'Deseja realmente deletar este usuário?',
                                async () => {
                                  const token = getToken()
                                  await fetch(`https://avadmin.avelarcompany.com.br/api/users/${user.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  })
                                  fetchUsers()
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <button onClick={() => { setShowModal(false); setSelectedUser(null); resetForm() }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">👤</span>Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.full_name ? 'border-red-500' : ''}`}
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Ex: João da Silva"
                    />
                    {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">CPF *</label>
                    <input
                      type="text"
                      className={`input-modern ${errors.cpf ? 'border-red-500' : ''}`}
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      disabled={!!selectedUser}
                    />
                    {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
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
                  <div>
                    <label className="block text-sm font-semibold mb-2">Data de Nascimento</label>
                    <input
                      type="date"
                      className="input-modern"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Access */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">🔐</span>Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Senha {selectedUser ? '(deixe em branco para manter)' : '*'}</label>
                    <input
                      type="password"
                      className={`input-modern ${errors.password ? 'border-red-500' : ''}`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Confirmar Senha</label>
                    <input
                      type="password"
                      className={`input-modern ${errors.confirm_password ? 'border-red-500' : ''}`}
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      placeholder="••••••••"
                    />
                    {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>}
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">⚙️</span>Permissões</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Perfil de Acesso</label>
                    <select className="input-modern" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium">Usuário Ativo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Client Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">🏷️</span>Tipo de Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Tipo</label>
                    <select className="input-modern" value={formData.client_type} onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}>
                      <option value="cliente">Cliente Final</option>
                      <option value="lojista">Lojista</option>
                      <option value="distribuidor">Distribuidor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="mr-2">📦</span>Módulos Habilitados</h3>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_MODULES.map((module) => (
                    <button
                      key={module}
                      type="button"
                      onClick={() => toggleModule(module)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        formData.enabled_modules.includes(module)
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      {formData.enabled_modules.includes(module) ? '✓ ' : ''}{module}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4 sticky bottom-0 bg-white">
              <button onClick={() => { setShowModal(false); setSelectedUser(null); resetForm() }} className="btn-secondary">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : (selectedUser ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

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
    </>
  )
}

