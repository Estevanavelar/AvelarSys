'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('avelar_token')
    const apiBase = process.env.NEXT_PUBLIC_API_URL

    const redirectToLogin = () => {
      localStorage.removeItem('avelar_token')
      localStorage.removeItem('avelar_user')
      router.push('/login')
    }

    const validateToken = async () => {
      if (!token || !apiBase) {
        redirectToLogin()
        return
      }
      try {
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          redirectToLogin()
          return
        }
        router.push('/select-module')
      } catch {
        redirectToLogin()
      }
    }

    validateToken()
  }, [router])

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[var(--background)] overflow-hidden">
      {/* Global Blobs */}
      <div className="avelar-blob top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-600/20"></div>
      <div className="avelar-blob bottom-[20%] right-[20%] w-[500px] h-[500px] bg-purple-600/20" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 text-center text-[var(--foreground)]">
        <div className="w-20 h-20 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-xl font-bold tracking-tight animate-pulse">Carregando o futuro...</p>
      </div>
    </div>
  )
}
