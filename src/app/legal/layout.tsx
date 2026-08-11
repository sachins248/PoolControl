import './legal.css'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Legal — PoolControl.ai',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dp-legal">
      <nav className="dp-legal-nav">
        <Link href="/" className="dp-legal-brand">
          <img src="/logo.jpeg" alt="" />
          POOLCONTROL<i>.AI</i>
        </Link>
        <div className="dp-legal-navlinks">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/ai">AI &amp; Data</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </nav>
      <main className="dp-legal-doc">{children}</main>
    </div>
  )
}
