import { useEffect, useState } from 'react'

const CONSENT_KEY = 'cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) setVisible(true)
  }, [])

  const handleAccept = () => {
    setLoading(true)
    localStorage.setItem(CONSENT_KEY, 'accepted')
    window.location.reload()
  }

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slideIn">
      <div className="avelar-card w-full max-w-sm backdrop-blur-3xl bg-[var(--glass-bg)] border border-[var(--card-border)] shadow-2xl p-6">
        <h4 className="text-lg font-bold text-[var(--foreground)] mb-2">Privacidade</h4>
        <p className="text-sm text-[var(--muted)] mb-6 font-medium leading-relaxed">
          Utilizamos cookies para otimizar sua experiência e garantir a segurança da navegação no ecossistema Avelar.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReject}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-[var(--card-border)] rounded-xl text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)] transition-all disabled:opacity-50"
          >
            Rejeitar
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide bg-[var(--accent)] text-[var(--background)] rounded-xl hover:opacity-90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin"></div>
            ) : null}
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
