import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import * as Sentry from '@sentry/nextjs'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export function generateMetadata(): Metadata {
  return {
    title: 'PoolControl.ai — Aquatics Performance Intelligence',
    description: 'Lifeguard performance management and liability reduction for aquatic facilities.',
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
