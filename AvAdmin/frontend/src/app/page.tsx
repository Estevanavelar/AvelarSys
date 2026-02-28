'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { extractAndSaveAuthFromUrl, isAuthenticated, redirectToLogin } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Primeiro tentar extrair auth da URL (vinda do AppPortal)
    const hasAuthFromUrl = extractAndSaveAuthFromUrl()
    
    // Se tem auth na URL ou já está autenticado, vai para dashboard
    if (hasAuthFromUrl || isAuthenticated()) {
      router.replace('/dashboard')
    } else {
      // Redirecionar para login unificado
      redirectToLogin()
    }
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="text-white text-center">
        <div className="animate-pulse-soft">
          <div className="flex flex-col items-center mb-4">
            <div 
              className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-4 mb-4"
              style={{ 
                backgroundImage: 'url(/logo-dark.png)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
            </div>
            <h1 className="text-4xl font-bold">AvAdmin</h1>
          </div>
          <p className="text-lg opacity-90">Administração SaaS</p>
          <div className="mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-ping mr-2"></div>
              Redirecionando...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}