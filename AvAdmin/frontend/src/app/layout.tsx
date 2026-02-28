import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppClient from '@/components/AppClient'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AvAdmin - AvelarSys',
  description: 'Administração SaaS para AvelarSys',
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50`}>
        <div id="root">
          <AppClient>{children}</AppClient>
        </div>
        <Toaster duration={5000} closeButton={false} />
      </body>
    </html>
  )
}