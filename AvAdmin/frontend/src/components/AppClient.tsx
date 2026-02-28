'use client'

import CookieConsent from './CookieConsent'
import { useWebSocket } from '../hooks/useWebSocket'

export default function AppClient({ children }: { children: React.ReactNode }) {
  useWebSocket()

  return (
    <>
      <CookieConsent />
      {children}
    </>
  )
}
