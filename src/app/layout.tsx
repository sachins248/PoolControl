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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Depth Protocol type system — shared by landing, auth, and app shell */}
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;700;900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@1,9..144,300..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
