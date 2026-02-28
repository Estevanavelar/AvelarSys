'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        const res = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
        if (!res.ok) return
        await navigator.serviceWorker.register('/sw.js')
      } catch (error) {
        console.error('Service Worker falhou:', error)
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
