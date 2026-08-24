'use client'

import { useState } from 'react'

interface MobileNavProps {
  mailDemo: string
}

const LINKS = [
  { href: '#protocol-01', label: 'AUDITS' },
  { href: '#protocol-02', label: 'COACH PC' },
  { href: '#process', label: 'PROCESS' },
  { href: '#pricing', label: 'PRICING' },
  { href: '#contact', label: 'CONTACT' },
]

export default function MobileNav({ mailDemo }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="dp-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={open ? 'dp-nav-toggle-x' : ''} />
      </button>

      <div className={`dp-mobile-menu ${open ? 'open' : ''}`}>
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <a href="/auth/login" onClick={() => setOpen(false)}>SIGN IN</a>
        <a href={mailDemo} className="dp-mobile-menu-cta" onClick={() => setOpen(false)}>
          REQUEST DEMO <span aria-hidden="true">→</span>
        </a>
      </div>
    </>
  )
}
