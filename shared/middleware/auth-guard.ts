// ========================================
// Auth Guard - Middleware de Proteção de Rotas
// ========================================
// Uso: Importar em cada módulo para proteger rotas

export interface AuthGuardConfig {
  moduleName: string
  allowedClientTypes: string[]
  allowedRoles?: string[]
  loginUrl: string
  avadminApiUrl: string
}

export interface UserData {
  id: string
  full_name: string
  cpf: string
  role: string
  account_id?: string
  client_type?: string
  enabled_modules: string[]
  whatsapp_verified: boolean
}

/**
 * Valida o token JWT com o AvAdmin
 */
async function validateTokenWithAvAdmin(token: string, apiUrl: string): Promise<UserData | null> {
  try {
    const response = await fetch(`${apiUrl}/api/internal/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Error validating token:', error)
    return null
  }
}

/**
 * Extrai token do cookie ou localStorage
 */
function getToken(): string | null {
  // Tentar localStorage primeiro
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('avelar_token')
    if (token) return token
  }

  // Tentar cookie
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'avelar_token') return value
    }
  }

  return null
}

/**
 * Redireciona para a página de login
 */
function redirectToLogin(originalUrl: string, loginUrl: string): void {
  const encoded = encodeURIComponent(originalUrl)
  window.location.href = `${loginUrl}/login?redirect=${encoded}`
}

/**
 * Redireciona para o portal com erro
 */
function redirectToApp(error: string, loginUrl: string): void {
  window.location.href = `${loginUrl}?error=${error}`
}

/**
 * Cria um guard de autenticação para módulos específicos
 */
export function createAuthGuard(config: AuthGuardConfig) {
  return async function checkAuth(): Promise<{ authenticated: boolean; user?: UserData; redirect?: string }> {
    // 1. Verificar token
    const token = getToken()
    if (!token) {
      return {
        authenticated: false,
        redirect: `${config.loginUrl}/login?redirect=${encodeURIComponent(window.location.href)}`
      }
    }

    // 2. Validar token com AvAdmin
    const user = await validateTokenWithAvAdmin(token, config.avadminApiUrl)
    if (!user) {
      return {
        authenticated: false,
        redirect: `${config.loginUrl}/login?redirect=${encodeURIComponent(window.location.href)}&error=session_expired`
      }
    }

    // 3. Verificar módulo ativo
    if (!user.enabled_modules.includes(config.moduleName)) {
      return {
        authenticated: false,
        redirect: `${config.loginUrl}?error=module_not_enabled`
      }
    }

    // 4. Verificar tipo de cliente
    if (user.client_type && !config.allowedClientTypes.includes(user.client_type)) {
      // Super admin tem acesso a tudo
      if (user.role !== 'super_admin') {
        return {
          authenticated: false,
          redirect: `${config.loginUrl}?error=access_denied`
        }
      }
    }

    // 5. Verificar role (opcional)
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      if (!config.allowedRoles.includes(user.role)) {
        return {
          authenticated: false,
          redirect: `${config.loginUrl}?error=insufficient_permissions`
        }
      }
    }

    // Autenticado com sucesso
    return {
      authenticated: true,
      user
    }
  }
}

/**
 * Hook React para usar o auth guard
 */
export function useAuthGuard(config: AuthGuardConfig) {
  const checkAuth = createAuthGuard(config)
  return { checkAuth }
}

// Guards pré-configurados para cada módulo
export const avadminGuard = createAuthGuard({
  moduleName: 'AvAdmin',
  allowedClientTypes: ['admin'],
  allowedRoles: ['super_admin', 'admin'],
  loginUrl: 'https://app.avelarcompany.com.br',
  avadminApiUrl: 'https://avadmin.avelarcompany.com.br'
})

export const stocktechGuard = createAuthGuard({
  moduleName: 'StockTech',
  allowedClientTypes: ['lojista', 'distribuidor'],
  loginUrl: 'https://app.avelarcompany.com.br',
  avadminApiUrl: 'https://avadmin.avelarcompany.com.br'
})

export const shopGuard = createAuthGuard({
  moduleName: 'Shop',
  allowedClientTypes: ['cliente'],
  loginUrl: 'https://app.avelarcompany.com.br',
  avadminApiUrl: 'https://avadmin.avelarcompany.com.br'
})

export const naldoGuard = createAuthGuard({
  moduleName: 'Naldo',
  allowedClientTypes: ['lojista', 'distribuidor'],
  loginUrl: 'https://app.avelarcompany.com.br',
  avadminApiUrl: 'https://avadmin.avelarcompany.com.br'
})

