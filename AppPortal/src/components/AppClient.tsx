'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useWebSocket } from '../hooks/useWebSocket'

const CookieConsent = dynamic(() => import('./CookieConsent'), { ssr: false })
const ServiceWorkerRegister = dynamic(() => import('./ServiceWorkerRegister'), { ssr: false })

export default function AppClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const enableWebSocket = pathname?.startsWith('/dashboard')
  useWebSocket({ enabled: enableWebSocket })

  return (
    <>
      <ServiceWorkerRegister />
      <CookieConsent />
      {children}
    </>
  )
}
