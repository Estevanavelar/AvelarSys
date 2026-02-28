// ========================================
// Constantes de Módulos - Avelar System
// ========================================

export const MODULE_DOMAINS: Record<string, string> = {
  AvAdmin: 'https://avadmin.avelarcompany.com.br',
  StockTech: 'https://stocktech.avelarcompany.com.br',
  Shop: 'https://shop.avelarcompany.com.br',
  Naldo: 'https://naldo.avelarcompany.com.br',
}

export const MODULE_CLIENT_TYPES: Record<string, string[]> = {
  AvAdmin: ['admin'],
  StockTech: ['lojista', 'distribuidor'],
  Shop: ['cliente'],
  Naldo: ['lojista', 'distribuidor'],
}

export const MODULE_ROLES: Record<string, string[]> = {
  AvAdmin: ['super_admin', 'admin'],
  StockTech: ['super_admin', 'admin', 'manager', 'user'],
  Shop: ['user', 'viewer'],
  Naldo: ['super_admin', 'admin', 'manager', 'user'],
}

export const MODULE_ICONS: Record<string, string> = {
  AvAdmin: '🏢',
  StockTech: '📦',
  Shop: '🛒',
  Naldo: '⛽',
}

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  AvAdmin: 'Painel de Administração do Sistema',
  StockTech: 'Marketplace B2B de Eletrônicos',
  Shop: 'Loja Online para Clientes',
  Naldo: 'Sistema de Distribuição de Gás',
}

export const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  AvAdmin: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
  StockTech: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
  Shop: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
  Naldo: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
}

export const ALL_MODULES = Object.keys(MODULE_DOMAINS)

export const CLIENT_TYPES = ['cliente', 'lojista', 'distribuidor', 'admin'] as const
export type ClientType = typeof CLIENT_TYPES[number]

export const USER_ROLES = ['super_admin', 'admin', 'manager', 'user', 'viewer'] as const
export type UserRole = typeof USER_ROLES[number]

export const APP_PORTAL_URL = 'https://app.avelarcompany.com.br'
export const AVADMIN_API_URL = 'https://avadmin.avelarcompany.com.br'

