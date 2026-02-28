import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppClient from '@/components/AppClient'

export const metadata: Metadata = {
  title: 'AvelarSys - Portal',
  description: 'Portal de acesso unificado do AvelarSys',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    apple: '/icons/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'icon', url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AvelarSys',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#003366',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased min-h-screen relative overflow-x-hidden">
        {/* Background Blobs Global */}
        <div className="avelar-blob top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/30"></div>
        <div className="avelar-blob bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/30" style={{ animationDelay: '4s' }}></div>
        
        <AppClient>{children}</AppClient>
      </body>
    </html>
  )
}

