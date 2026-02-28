'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoutSlider from '@/components/LogoutSlider'
import {
  clearAuth,
  getAccessibleModules,
  getAuthenticatedRedirectUrl,
  getToken,
  getUser,
  MODULE_DESCRIPTIONS,
  MODULE_DOMAINS,
  MODULE_ICONS,
  saveAuth,
  UserInfo,
} from '@/lib/redirect'

type DashboardTab =
  | 'modules'
  | 'billing'
  | 'employees'
  | 'companyProfile'
  | 'ownerProfile'
  | 'profile'
  | 'family'

interface AccountInfo {
  id: string
  company_name: string
  cnpj: string
  whatsapp: string
  plan_id: string
  status: string
  trial_ends_at: string | null
}

interface PlanInfo {
  id: string
  name: string
  price: number
  billing_cycle: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessibleModules, setAccessibleModules] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<DashboardTab>('modules')
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    whatsapp: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false)
  const [loadingModule, setLoadingModule] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://app.avelarcompany.com.br'

  const isCompany = useMemo(() => {
    if (!user) return false
    return Boolean(user.account_id) || user.role === 'admin'
  }, [user])

  const documentDigits = useMemo(() => {
    return (user?.cpf || '').replace(/\D/g, '')
  }, [user])

  const isCnpjLogin = documentDigits.length === 14
  const isCpfLogin = documentDigits.length === 11
  const showEmployees = isCompany && isCnpjLogin
  const showCompanyProfile = isCompany && isCnpjLogin
  const showOwnerProfile = isCompany && isCnpjLogin
  const showProfile = !isCnpjLogin
  const showFamily = !isCnpjLogin
  const canSwitchToCompany =
    Boolean(user?.account_id) &&
    user?.role === 'admin' &&
    isCpfLogin &&
    user?.client_type !== 'cliente'

  const firstAvailableTab = useMemo<DashboardTab>(() => {
    const availableTabs: DashboardTab[] = ['modules', 'billing']
    if (showEmployees) availableTabs.push('employees')
    if (showCompanyProfile) availableTabs.push('companyProfile')
    if (showOwnerProfile) availableTabs.push('ownerProfile')
    if (showProfile) availableTabs.push('profile')
    if (showFamily) availableTabs.push('family')
    return availableTabs[0]
  }, [showEmployees, showCompanyProfile, showOwnerProfile, showProfile, showFamily])

  useEffect(() => {
    if (!loading) {
      setActiveTab(firstAvailableTab)
    }
  }, [firstAvailableTab, loading])

  useEffect(() => {
    const userData = getUser()

    if (!userData) {
      router.push('/login')
      return
    }

    if (userData.role === 'super_admin') {
      router.push('/select-module')
      return
    }

    setUser(userData)
    setAccessibleModules(getAccessibleModules(userData))
    setProfileForm({
      full_name: userData.full_name,
      whatsapp: userData.whatsapp || '',
    })
    
    // Fetch account and plan data if available
    const fetchData = async () => {
      const token = getToken()
      if (!token) return

      try {
        // Fetch User details
        const userRes = await fetch(`${API_URL}/api/users/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (userRes.ok) {
          const uData = await userRes.json()
          setProfileForm({
            full_name: uData.full_name,
            whatsapp: uData.whatsapp || '',
          })
        }

        if (userData.account_id) {
          const accRes = await fetch(`${API_URL}/api/accounts/${userData.account_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (accRes.ok) {
            const accData = await accRes.json()
            setAccount(accData)

            if (accData.plan_id) {
              const planRes = await fetch(`${API_URL}/api/plans/${accData.plan_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (planRes.ok) {
                const pData = await planRes.json()
                setPlan(pData.plan)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, API_URL])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSavingProfile(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      })

      if (res.ok) {
        const data = await res.json()
        const newUser = { ...user, ...profileForm }
        setUser(newUser)
        saveAuth(token!, newUser)
        setIsEditingProfile(false)
        alert('Perfil atualizado com sucesso!')
      } else {
        alert('Erro ao atualizar perfil')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Erro de conexão ao atualizar perfil')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const handleSwitchToCompany = async () => {
    setIsSwitchingCompany(true)
    try {
      const token = getToken()
      if (!token) {
        router.push('/login?mode=cnpj')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/switch-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (!response.ok) {
        router.push('/login?mode=cnpj')
        return
      }

      saveAuth(data.access_token, data.user)
      window.location.reload()
    } catch {
      router.push('/login?mode=cnpj')
    } finally {
      setIsSwitchingCompany(false)
    }
  }

  const handleModuleSelect = (module: string) => {
    setLoadingModule(module)
    const url = MODULE_DOMAINS[module]
    const token = getToken()
    if (url && token && user) {
      window.location.href = getAuthenticatedRedirectUrl(url, token, user)
      return
    }
    if (url) {
      window.location.href = url
    }
  }

  // Mapeamento de cores (mantido, mas adaptado se necessário para o tema monochrome se desejado, 
  // ou mantido colorido para destaque)
  const moduleColors: Record<string, { bg: string; text: string }> = {
    AvAdmin: { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-600' },
    StockTech: { bg: 'from-purple-500 to-indigo-500', text: 'text-purple-600' },
    Shop: { bg: 'from-emerald-500 to-teal-500', text: 'text-emerald-600' },
    Naldo: { bg: 'from-amber-500 to-orange-500', text: 'text-amber-600' },
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center text-[var(--foreground)]">
          <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-[var(--foreground)] selection:bg-[var(--selection)]">
      
      <main className="relative z-10 py-12 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-[var(--foreground)] mb-4">
              Olá, {user?.full_name?.split(' ')[0]}! 👋
            </h2>
          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto">
            Bem-vindo ao seu painel de controle. Selecione um módulo abaixo ou gerencie suas configurações.
            </p>
          </div>

        {/* Navigation Tabs (Segmented Control) */}
        <div className="flex justify-center mb-12">
          <div className="nav-pill inline-flex overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => setActiveTab('modules')}
              className={`nav-pill-item ${activeTab === 'modules' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
            >
              📦 Módulos
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`nav-pill-item ${activeTab === 'billing' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
            >
              💳 Faturamento
            </button>
            {showEmployees && (
              <button
                onClick={() => setActiveTab('employees')}
                className={`nav-pill-item ${activeTab === 'employees' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
              >
                👥 Equipe
              </button>
            )}
            {showCompanyProfile && (
              <button
                onClick={() => setActiveTab('companyProfile')}
                className={`nav-pill-item ${activeTab === 'companyProfile' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
              >
                🏢 Empresa
              </button>
            )}
            {showOwnerProfile && (
              <button
                onClick={() => setActiveTab('ownerProfile')}
                className={`nav-pill-item ${activeTab === 'ownerProfile' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
              >
                👤 Dono
              </button>
            )}
            {showProfile && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`nav-pill-item ${activeTab === 'profile' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
              >
                👤 Perfil
              </button>
            )}
            {showFamily && (
              <button
                onClick={() => setActiveTab('family')}
                className={`nav-pill-item ${activeTab === 'family' ? 'nav-pill-item-active' : 'nav-pill-item-inactive'}`}
              >
                👪 Família
              </button>
            )}
          </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'modules' && (
            <section className="animate-fadeIn">
              {accessibleModules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {accessibleModules.map((module, index) => (
                    <button
                      key={module}
                      onClick={() => handleModuleSelect(module)}
                      disabled={loadingModule !== null}
                      className="avelar-card group text-left relative overflow-hidden disabled:opacity-70"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {loadingModule === module && (
                        <div className="absolute inset-0 bg-[var(--background)]/40 backdrop-blur-sm flex items-center justify-center z-20 animate-fadeIn">
                          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <div className="flex items-start space-x-6 relative z-10">
                      <div 
                        className="w-20 h-20 bg-[var(--background)] rounded-[1.5rem] flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden p-4"
                        style={{ 
                          backgroundImage: 'url(/logo-dark.png)', 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center' 
                        }}
                      >
                        </div>
                      <div className="flex-1 pt-2">
                        <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                            {module}
                          </h3>
                        <p className="text-sm text-[var(--muted)] mt-1 font-medium">
                          {MODULE_DESCRIPTIONS[module] || 'Acessar módulo'}
                          </p>
                        <div className="mt-6 flex items-center text-[var(--accent)] font-bold text-sm uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          <span>Entrar agora</span>
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                      </div>
                    </div>
                    </button>
                  ))}
                </div>
              ) : (
              <div className="avelar-card text-center py-16">
                <div className="text-6xl mb-6">🔒</div>
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                  Acesso Restrito
                  </h3>
                <p className="text-[var(--muted)] mb-8 max-w-md mx-auto">
                  Sua conta não possui módulos ativos no momento.
                  </p>
                  <a
                  href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                  className="btn-primary inline-flex"
                  >
                  Falar com Suporte
                  </a>
                </div>
              )}
            </section>
          )}

          {activeTab === 'billing' && (
          <section className="animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="avelar-card">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--background)] flex items-center justify-center text-sm">✓</span>
                Plano Atual
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Pacote</span>
                  <span className="font-bold text-[var(--foreground)]">{plan?.name || 'Carregando...'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Valor</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {plan?.price === 0 ? 'Grátis' : `R$ ${(plan?.price || 0).toFixed(2).replace('.', ',')}/${plan?.billing_cycle === 'monthly' ? 'mês' : plan?.billing_cycle === 'yearly' ? 'ano' : 'vitalício'}`}
                  </span>
                </div>
                {plan?.billing_cycle !== 'lifetime' && (
                  <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                    <span className="text-[var(--muted)]">Próxima Fatura</span>
                    <span className="font-bold text-[var(--foreground)]">--/--</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Status</span>
                  <span className="font-bold text-[var(--foreground)] uppercase">{account?.status || 'Ativo'}</span>
                </div>
              </div>
              <button 
                disabled
                className="btn-primary w-full mt-8 opacity-50 cursor-not-allowed"
              >
                Gerenciar Assinatura
              </button>
            </div>
            
            <div className="avelar-card">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[var(--card)] text-[var(--foreground)] flex items-center justify-center text-sm border border-[var(--card-border)]">↺</span>
                Histórico
              </h3>
              <div className="space-y-2">
                {[
                  { date: '10/01/2026', value: 'R$ 99,90', status: 'Pago' },
                  { date: '10/12/2025', value: 'R$ 99,90', status: 'Pago' },
                  { date: '10/11/2025', value: 'R$ 99,90', status: 'Pago' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[var(--background)]/50 border border-[var(--card-border)]">
                    <span className="text-sm font-medium text-[var(--foreground)]">{item.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--muted)]">{item.value}</span>
                      <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md">{item.status}</span>
                </div>
                  </div>
                ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="animate-fadeIn max-w-2xl mx-auto w-full">
              <div className="avelar-card">
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-8 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--background)] flex items-center justify-center text-xl">👤</span>
                  Meu Perfil
                </h3>
                
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Nome Completo</label>
                      <input
                        type="text"
                        required
                        className="avelar-input w-full"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">WhatsApp</label>
                      <input
                        type="text"
                        required
                        className="avelar-input w-full"
                        value={profileForm.whatsapp}
                        onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {isSavingProfile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
                            Salvando...
                          </>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="btn-secondary px-8"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Nome</p>
                        <p className="text-lg font-bold text-[var(--foreground)]">{user?.full_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">CPF</p>
                        <p className="text-lg font-bold text-[var(--foreground)]">{user?.cpf}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">WhatsApp</p>
                        <p className="text-lg font-bold text-[var(--foreground)]">{user?.whatsapp || 'Não informado'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Nível de Acesso</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--accent)]/10 text-[var(--accent)] uppercase tracking-wider">
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="btn-primary w-full mt-8"
                    >
                      Editar Perfil
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* Other tabs can be implemented similarly with .avelar-card structure */}
        {(activeTab === 'employees' || activeTab === 'companyProfile' || activeTab === 'ownerProfile' || activeTab === 'family') && (
            <section className="animate-fadeIn">
            <div className="avelar-card min-h-[300px] flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-4 opacity-50">🚧</div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">Em Desenvolvimento</h3>
              <p className="text-[var(--muted)] mt-2">Este módulo estará disponível em breve com o novo design.</p>
              </div>
            </section>
          )}
      </main>

      <footer className="mt-20 pb-12 px-4 border-t border-[var(--card-border)]/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 pt-10">
          <div className="glass rounded-[2rem] px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full max-w-4xl hover:bg-[var(--glass-bg)]/80 transition-all duration-300">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:space-x-4">
              <div 
                className="w-12 h-12 bg-[var(--accent)] text-[var(--background)] rounded-2xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden p-2"
                style={{ 
                  backgroundImage: 'url(/logo-dark.png)', 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center' 
                }}
              >
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-[var(--foreground)]">
                  Avelar System
                </h1>
                <p className="text-xs sm:text-sm text-[var(--muted)] font-medium">
                  Central de Gestão
                </p>
              </div>
            </div>

            {user && (
              <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                <LogoutSlider user={user} onLogout={handleLogout} />
                
                {canSwitchToCompany && (
                  <button
                    onClick={handleSwitchToCompany}
                    disabled={isSwitchingCompany}
                    className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)] transition-colors px-3 py-1 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSwitchingCompany ? (
                      <>
                        <div className="w-3 h-3 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
                        Mudando...
                      </>
                    ) : (
                      'Mudar para empresa →'
                    )}
                  </button>
                )}
              </div>
          )}
        </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold tracking-widest uppercase text-[var(--muted)]">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> SSL Seguro</span>
            <span className="flex items-center gap-2">🇧🇷 Brasil</span>
            <span>© 2026 Avelar Company</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
