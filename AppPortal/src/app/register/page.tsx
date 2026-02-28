'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type RegisterType = 'cpf' | 'cnpj' | null
type RegisterFormData = {
  companyName: string
  cnpj: string
  adminName: string
  adminCpf: string
  adminWhatsapp: string
  adminBirthDate: string
  fullName: string
  cpf: string
  whatsapp: string
  birthDate: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = useMemo<RegisterType>(() => {
    const typeParam = searchParams.get('type')
    return typeParam === 'cnpj' || typeParam === 'cpf' ? typeParam : null
  }, [searchParams])

  const [type, setType] = useState<RegisterType>(initialType)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingStep, setLoadingStep] = useState<boolean>(false)
  const [navLoading, setNavLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: '', cnpj: '',
    adminName: '', adminCpf: '', adminWhatsapp: '', adminBirthDate: '',
    fullName: '', cpf: '', whatsapp: '', birthDate: '',
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    password: '', confirmPassword: '', acceptTerms: false
  })

  useEffect(() => {
    router.prefetch('/register/services')
    router.prefetch('/login')
  }, [router])

  useEffect(() => {
    if (initialType) {
      setType(initialType)
      setStep(1)
    }
  }, [initialType])

  const formatCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  const formatCNPJ = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  const formatPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  const formatCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2')
  const onlyDigits = (v: string) => v.replace(/\D/g, '')

  const validateCPF = (value: string) => {
    const cpf = onlyDigits(value)
    if (cpf.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i)
    let remainder = sum % 11
    const firstDigit = remainder < 2 ? 0 : 11 - remainder
    if (Number(cpf[9]) !== firstDigit) return false
    sum = 0
    for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i)
    remainder = sum % 11
    const secondDigit = remainder < 2 ? 0 : 11 - remainder
    return Number(cpf[10]) === secondDigit
  }

  const validateCNPJ = (value: string) => {
    const cnpj = onlyDigits(value)
    if (cnpj.length !== 14) return false
    if (/^(\d)\1{13}$/.test(cnpj)) return false
    const calcDigit = (base: string, weights: number[]) => {
      const sum = weights.reduce((acc, weight, idx) => acc + Number(base[idx]) * weight, 0)
      const remainder = sum % 11
      return remainder < 2 ? 0 : 11 - remainder
    }
    const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const firstDigit = calcDigit(cnpj.slice(0, 12), firstWeights)
    if (Number(cnpj[12]) !== firstDigit) return false
    const secondDigit = calcDigit(cnpj.slice(0, 13), secondWeights)
    return Number(cnpj[13]) === secondDigit
  }

  const validateWhatsapp = (value: string) => {
    const digits = onlyDigits(value)
    return digits.length === 10 || digits.length === 11
  }

  const validatePassword = (value: string) => {
    if (!value || value.length < 8) return false
    const hasLetter = /[A-Za-z]/.test(value)
    const hasNumber = /\d/.test(value)
    return hasLetter && hasNumber
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value, type: inputType, checked } = e.target
    if (name === 'cpf' || name === 'adminCpf') value = formatCPF(value)
    if (name === 'cnpj') value = formatCNPJ(value)
    if (name === 'whatsapp' || name === 'adminWhatsapp') value = formatPhone(value)
    if (name === 'cep') value = formatCEP(value)
    setFormData((prev: RegisterFormData) => ({ ...prev, [name]: inputType === 'checkbox' ? checked : value }))
  }

  const fetchCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '')
    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setFormData((prev: RegisterFormData) => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }))
        } else {
          setError((prev: string) => prev || 'CEP não encontrado. Preencha manualmente.')
        }
      } catch {
        setError((prev: string) => prev || 'Não foi possível buscar o CEP. Preencha manualmente.')
      }
    }
  }

  const totalSteps = type === 'cnpj' ? 4 : 3

  const validateStep = () => {
    if (!type) {
      setError('Selecione o tipo de cadastro')
      return false
    }

    if (type === 'cpf') {
      if (step === 1) {
        if (!formData.fullName || !formData.cpf || !formData.whatsapp || !formData.birthDate) {
          setError('Preencha todos os campos obrigatórios'); return false
        }
        if (!validateCPF(formData.cpf)) { setError('CPF inválido'); return false }
        if (!validateWhatsapp(formData.whatsapp)) { setError('WhatsApp inválido'); return false }
      } else if (step === 2) {
        if (!formData.cep || !formData.street || !formData.number || !formData.city || !formData.state) {
          setError('Preencha todos os campos de endereço'); return false
        }
      } else if (step === 3) {
        if (!validatePassword(formData.password)) { setError('Senha deve ter no mínimo 8 caracteres e conter letras e números'); return false }
        if (formData.password !== formData.confirmPassword) { setError('Senhas não conferem'); return false }
        if (!formData.acceptTerms) { setError('Aceite os termos de uso'); return false }
      }
    }

    if (type === 'cnpj') {
      if (step === 1 && (!formData.companyName || !formData.cnpj)) { setError('Preencha os dados da empresa'); return false }
      if (step === 1 && !validateCNPJ(formData.cnpj)) { setError('CNPJ inválido'); return false }
      if (step === 2 && (!formData.adminName || !formData.adminCpf || !formData.adminWhatsapp)) { setError('Preencha os dados do responsavel'); return false }
      if (step === 2 && !validateCPF(formData.adminCpf)) { setError('CPF inválido'); return false }
      if (step === 2 && !validateWhatsapp(formData.adminWhatsapp)) { setError('WhatsApp inválido'); return false }
      if (step === 3 && (!formData.cep || !formData.street || !formData.number || !formData.city)) { setError('Preencha o endereco'); return false }
      if (step === 4) {
        if (!validatePassword(formData.password)) { setError('Senha deve ter no mínimo 8 caracteres e conter letras e números'); return false }
        if (formData.password !== formData.confirmPassword) { setError('Senhas nao conferem'); return false }
        if (!formData.acceptTerms) { setError('Aceite os termos'); return false }
      }
    }

    setError('')
    return true
  }

  const handleNav = (path: string) => {
    setNavLoading(path)
    setTimeout(() => {
      router.push(path)
    }, 500)
  }

  const nextStep = () => {
    if (validateStep()) {
      setLoadingStep(true)
      setTimeout(() => {
        setStep((s: number) => Math.min(s + 1, totalSteps))
        setLoadingStep(false)
      }, 400)
    }
  }

  const prevStep = () => {
    setLoadingStep(true)
    setTimeout(() => {
      if (step === 1) {
        setType(null)
        setError('')
      } else {
        setStep((s: number) => Math.max(s - 1, 1))
      }
      setLoadingStep(false)
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep()) return
    setLoading(true)
    try {
      const payload = type === 'cnpj'
        ? { type: 'cnpj', ...formData }
        : { type: 'cpf', ...formData }
      sessionStorage.setItem('registerData', JSON.stringify(payload))
      router.push('/register/services')
    } catch (err) {
      setError('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-start sm:items-center justify-center bg-[var(--background)] px-4 py-6 sm:py-10 overflow-hidden text-[var(--foreground)] selection:bg-[var(--selection)]">
      {/* Background Blobs */}
      <div className="avelar-blob top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--muted)]/30"></div>
      <div className="avelar-blob bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-2xl animate-fadeIn">
        <div className="text-center mb-8 sm:mb-10">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 glass rounded-[2.5rem] mb-6 shadow-xl overflow-hidden p-4"
            style={{ 
              backgroundImage: 'url(/logo-dark.png)', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2">
            {type === 'cnpj' ? 'Cadastro Empresa' : type === 'cpf' ? 'Pessoa Física' : 'Criar Conta'}
          </h1>
          <p className="text-[var(--muted)] text-sm sm:text-base font-medium">
            {type ? `Passo ${step} de ${totalSteps}` : 'Escolha como você deseja se cadastrar'}
          </p>
        </div>

        {type && (
          <div className="flex justify-center mb-8 sm:mb-10 animate-fadeIn">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const current = index + 1
              return (
                <div key={current} className="flex items-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all duration-500 ${
                    step >= current
                      ? 'bg-[var(--muted)]/30 text-[var(--foreground)] shadow-lg scale-110'
                      : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
                  }`}>
                    {current}
                  </div>
                  {current < totalSteps && (
                    <div className={`w-8 sm:w-16 h-1 mx-2 rounded-full transition-colors duration-500 ${
                      step > current ? 'bg-[var(--muted)]/30' : 'bg-[var(--card-border)]'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!type ? (
          <div className="avelar-card p-8 sm:p-10 animate-slideIn">
            <h2 className="text-xl font-bold text-[var(--foreground)] text-center mb-8 uppercase tracking-widest opacity-80">Você é:</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                type="button"
                onClick={() => {
                  setLoadingStep(true)
                  setTimeout(() => {
                    setType('cpf')
                    setStep(1)
                    setLoadingStep(false)
                  }, 400)
                }}
                disabled={loadingStep}
                className="group p-6 rounded-[2rem] bg-[var(--background)] border border-[var(--card-border)] hover:border-[var(--muted)]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-left relative overflow-hidden disabled:opacity-50"
              >
                {loadingStep && (
                  <div className="absolute inset-0 bg-[var(--background)]/40 backdrop-blur-sm flex items-center justify-center z-20 animate-fadeIn">
                    <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">👤</span>
                </div>
                <div className="w-14 h-14 bg-[var(--muted)]/20 rounded-2xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">
                  👤
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Pessoa Física</h3>
                <p className="text-sm text-[var(--muted)] mb-4 font-medium">Para lojistas autônomos ou clientes que usam CPF</p>
                <span className="text-[var(--muted)] text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  Começar <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoadingStep(true)
                  setTimeout(() => {
                    setType('cnpj')
                    setStep(1)
                    setLoadingStep(false)
                  }, 400)
                }}
                disabled={loadingStep}
                className="group p-6 rounded-[2rem] bg-[var(--background)] border border-[var(--card-border)] hover:border-green-500/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-left relative overflow-hidden disabled:opacity-50"
              >
                {loadingStep && (
                  <div className="absolute inset-0 bg-[var(--background)]/40 backdrop-blur-sm flex items-center justify-center z-20 animate-fadeIn">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">🏪</span>
                </div>
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">
                  🏪
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Empresa</h3>
                <p className="text-sm text-[var(--muted)] mb-4 font-medium">Para empresas com CNPJ e múltiplos funcionários</p>
                <span className="text-green-600 dark:text-green-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  Começar <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-[var(--card-border)] text-center">
              <p className="text-sm text-[var(--muted)] font-medium flex items-center justify-center gap-2">
                Já possui uma conta? 
                <button
                  type="button"
                  onClick={() => handleNav('/login')}
                  disabled={loadingStep || !!navLoading}
                  className="text-[var(--accent)] font-bold hover:underline flex items-center gap-2 disabled:opacity-50"
                >
                  {navLoading === '/login' && (
                    <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Fazer login
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="avelar-card p-6 sm:p-10 backdrop-blur-3xl bg-[var(--glass-bg)]/80 animate-slideIn">
            <form onSubmit={handleSubmit}>
              {type === 'cpf' && step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xl">👤</div>
                    <h3 className="text-xl font-bold">Dados Pessoais</h3>
                  </div>
                  <div className="space-y-4">
                    <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nome Completo *" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    <input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF *" maxLength={14} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="WhatsApp *" maxLength={15} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                      <input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium text-[var(--muted)]" required />
                    </div>
                  </div>
                </div>
              )}

              {type === 'cnpj' && step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div 
                      className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-xl overflow-hidden p-2"
                      style={{ 
                        backgroundImage: 'url(/logo-dark.png)', 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center' 
                      }}
                    >
                    </div>
                    <h3 className="text-xl font-bold">Dados da Empresa</h3>
                  </div>
                  <div className="space-y-4">
                    <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Razão Social *" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium" required />
                    <input name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="CNPJ *" maxLength={18} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium" required />
                  </div>
                </div>
              )}

              {type === 'cnpj' && step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--muted)]/20 text-[var(--muted)] flex items-center justify-center text-xl">👤</div>
                    <h3 className="text-xl font-bold">Responsável</h3>
                  </div>
                  <div className="space-y-4">
                    <input name="adminName" value={formData.adminName} onChange={handleChange} placeholder="Nome Completo *" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium" required />
                    <input name="adminCpf" value={formData.adminCpf} onChange={handleChange} placeholder="CPF *" maxLength={14} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium" required />
                    <input name="adminWhatsapp" value={formData.adminWhatsapp} onChange={handleChange} placeholder="WhatsApp *" maxLength={15} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium" required />
                    <input name="adminBirthDate" type="date" value={formData.adminBirthDate} onChange={handleChange} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-[var(--muted)]" />
                  </div>
                </div>
              )}

              {(type === 'cpf' && step === 2) || (type === 'cnpj' && step === 3) ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-xl">📍</div>
                    <h3 className="text-xl font-bold">{type === 'cnpj' ? 'Endereço da Empresa' : 'Endereço'}</h3>
                  </div>
                  <div className="space-y-4">
                    <input name="cep" value={formData.cep} onChange={handleChange} onBlur={(e: React.FocusEvent<HTMLInputElement>) => fetchCEP(e.target.value)} placeholder="CEP *" maxLength={9} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input name="street" value={formData.street} onChange={handleChange} placeholder="Rua *" className="sm:col-span-2 w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                      <input name="number" value={formData.number} onChange={handleChange} placeholder="Nº *" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    </div>
                    <input name="complement" value={formData.complement} onChange={handleChange} placeholder="Complemento" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" />
                    <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} placeholder="Bairro *" className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input name="city" value={formData.city} onChange={handleChange} placeholder="Cidade *" className="sm:col-span-2 w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                      <input name="state" value={formData.state} onChange={handleChange} placeholder="UF *" maxLength={2} className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium" required />
                    </div>
                  </div>
                </div>
              ) : null}

              {(type === 'cpf' && step === 3) || (type === 'cnpj' && step === 4) ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-xl">🔐</div>
                    <h3 className="text-xl font-bold">Segurança</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Senha (mín. 6 caracteres) *"
                        className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl pr-12 focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev: boolean) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirmar Senha *"
                        className="w-full px-5 py-4 bg-gray-500/30 border border-[var(--card-border)] rounded-2xl pr-12 focus:outline-none focus:ring-2 focus:ring-[var(--muted)]/30 transition-all font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev: boolean) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="pt-4 border-t border-[var(--card-border)]">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-[var(--muted)] focus:ring-[var(--muted)]/30 mt-0.5" />
                        <span className="text-sm text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                          Li e concordo com os <a href="#" className="text-[var(--muted)] font-bold hover:underline">Termos de Uso</a> e <a href="#" className="text-[var(--muted)] font-bold hover:underline">Política de Privacidade</a>.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fadeIn">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between mt-8 pt-6 border-t border-[var(--card-border)]">
                <button 
                  type="button" 
                  onClick={prevStep} 
                  disabled={loadingStep || loading}
                  className="px-8 py-4 rounded-xl border border-[var(--card-border)] hover:bg-[var(--card)] font-bold transition-all text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingStep && step > 1 ? (
                    <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  ← Voltar
                </button>
                {step < totalSteps ? (
                  <button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={loadingStep || loading}
                    className="px-8 py-4 bg-[var(--muted)]/30 hover:bg-[var(--muted)]/40 text-[var(--foreground)] rounded-xl font-bold shadow-lg hover:shadow-black/10 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
                  >
                    {loadingStep ? (
                      <div className="w-4 h-4 border-2 border-[var(--foreground)] border-t-transparent rounded-full animate-spin"></div>
                    ) : null}
                    Próximo →
                  </button>
                ) : (
                  <button type="submit" disabled={loading || loadingStep} className="px-8 py-4 bg-[var(--muted)]/30 hover:bg-[var(--muted)]/40 text-[var(--foreground)] rounded-xl font-bold shadow-xl hover:shadow-black/10 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-none w-full sm:w-auto">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processando...</span>
                    ) : 'Finalizar Cadastro ✨'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}