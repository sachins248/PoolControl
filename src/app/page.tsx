import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RootPage() {
  const profile = await getServerUser()
  if (profile) {
    if (profile.role === 'lifeguard') redirect('/my-profile')
    if (profile.role === 'corporate') redirect('/dashboard')
    redirect('/schedule')
  }

  return (
    <>
      {/* Font loading */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        :root {
          --navy: #080f1a;
          --navy-2: #0d1e30;
          --navy-3: #112440;
          --emerald: #00c87a;
          --emerald-dim: #00a865;
          --cream: #f5f3ee;
          --text: #f0ede6;
          --muted: rgba(240,237,230,0.45);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: #1a1a1a;
          overflow-x: hidden;
        }

        .display {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
        }

        /* Hero noise texture */
        .hero-bg {
          background-color: var(--navy);
          background-image:
            radial-gradient(ellipse 80% 50% at 60% -10%, rgba(0,200,122,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 10% 100%, rgba(0,100,200,0.08) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        }

        /* Scroll reveal */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-delay-5 { transition-delay: 0.5s; }

        /* Hero entrance */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-tag   { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .hero-h1    { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .hero-sub   { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .hero-ctas  { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s both; }

        /* Nav */
        .nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(8,15,26,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 32px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-mark {
          width: 34px; height: 34px; background: var(--emerald);
          border-radius: 9px; display: flex; align-items: center; justify-content: center;
        }
        .nav-logo-mark svg { width: 16px; height: 16px; stroke: white; fill: none; stroke-width: 2.5; stroke-linecap: round; }
        .nav-logo-text { color: white; font-weight: 600; font-size: 15px; letter-spacing: -0.02em; }
        .nav-links { display: flex; gap: 32px; }
        .nav-links a { color: rgba(255,255,255,0.5); font-size: 14px; text-decoration: none; font-weight: 400; transition: color 0.2s; }
        .nav-links a:hover { color: white; }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .nav-signin { color: rgba(255,255,255,0.5); font-size: 14px; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .nav-signin:hover { color: white; }
        .btn-primary {
          background: var(--emerald); color: #080f1a; font-size: 13px; font-weight: 700;
          padding: 9px 20px; border-radius: 8px; text-decoration: none;
          transition: background 0.15s, transform 0.1s; letter-spacing: -0.01em;
        }
        .btn-primary:hover { background: #00e68c; }
        .btn-primary:active { transform: scale(0.97); }

        /* Hero */
        .hero {
          padding: 100px 32px 110px;
          text-align: center;
          position: relative;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1px solid rgba(0,200,122,0.25);
          background: rgba(0,200,122,0.07);
          color: var(--emerald); font-size: 12px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 100px; margin-bottom: 28px;
        }
        .hero-eyebrow-dot { width: 6px; height: 6px; background: var(--emerald); border-radius: 50%; }
        .hero h1 {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: clamp(52px, 7vw, 84px);
          font-weight: 400;
          color: var(--text);
          line-height: 1.05;
          letter-spacing: -0.03em;
          max-width: 900px; margin: 0 auto 24px;
        }
        .hero h1 em {
          font-style: italic;
          background: linear-gradient(135deg, var(--emerald) 0%, #00f59b 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero p {
          color: var(--muted); font-size: 17px; line-height: 1.7;
          max-width: 540px; margin: 0 auto 40px;
          font-weight: 300;
        }
        .hero-cta-group { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .cta-main {
          background: var(--emerald); color: #080f1a;
          font-weight: 700; font-size: 14px; letter-spacing: -0.01em;
          padding: 14px 28px; border-radius: 10px; text-decoration: none;
          display: flex; align-items: center; gap: 8px;
          box-shadow: 0 0 0 1px rgba(0,200,122,0.3), 0 8px 32px rgba(0,200,122,0.2);
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
        }
        .cta-main:hover { background: #00e68c; box-shadow: 0 0 0 1px rgba(0,200,122,0.4), 0 12px 40px rgba(0,200,122,0.3); }
        .cta-main:active { transform: scale(0.97); }
        .cta-ghost {
          border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
          font-weight: 500; font-size: 14px; padding: 13px 24px; border-radius: 10px;
          text-decoration: none; display: flex; align-items: center; gap: 7px;
          transition: border-color 0.15s, color 0.15s, transform 0.1s; background: rgba(255,255,255,0.03);
        }
        .cta-ghost:hover { border-color: rgba(255,255,255,0.35); color: white; }
        .cta-ghost:active { transform: scale(0.97); }
        .hero-disclaimer { color: rgba(255,255,255,0.2); font-size: 12px; margin-top: 18px; }

        /* Stats bar */
        .stats-bar { background: var(--emerald); padding: 18px 32px; }
        .stats-inner {
          max-width: 1000px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          text-align: center;
        }
        .stat-value { color: #080f1a; font-size: 20px; font-weight: 700; letter-spacing: -0.03em; }
        .stat-label { color: rgba(8,15,26,0.6); font-size: 12px; font-weight: 500; margin-top: 1px; }

        /* Sections */
        .section { padding: 96px 32px; }
        .section-inner { max-width: 1100px; margin: 0 auto; }
        .section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--emerald-dim); margin-bottom: 14px;
        }
        .section-h2 {
          font-family: 'Instrument Serif', serif; font-style: italic;
          font-size: clamp(32px, 4vw, 48px); font-weight: 400;
          letter-spacing: -0.03em; line-height: 1.1;
          color: #0d1e30; margin-bottom: 16px;
        }
        .section-h2.light { color: var(--text); }
        .section-sub { color: #6b7280; font-size: 16px; line-height: 1.7; max-width: 560px; font-weight: 300; }
        .section-sub.light { color: var(--muted); }

        /* Problem cards */
        .problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
        .problem-card {
          background: white; border: 1px solid #e8e4dc;
          border-radius: 16px; padding: 28px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .problem-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .problem-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .problem-icon svg { width: 19px; height: 19px; stroke-width: 2; }
        .problem-card h3 { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 8px; letter-spacing: -0.02em; }
        .problem-card p { font-size: 14px; color: #6b7280; line-height: 1.65; font-weight: 300; }

        /* Features */
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
        .feature-card {
          border: 1px solid #e8e4dc; border-radius: 16px; padding: 28px;
          background: white;
          transition: box-shadow 0.2s, transform 0.2s;
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--emerald), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width: 40px; height: 40px; background: rgba(0,200,122,0.08);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .feature-icon svg { width: 19px; height: 19px; stroke: var(--emerald); stroke-width: 2; fill: none; }
        .feature-card h3 { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 8px; letter-spacing: -0.02em; }
        .feature-card p { font-size: 14px; color: #6b7280; line-height: 1.65; font-weight: 300; }

        /* Dark section */
        .dark-section { background: var(--navy); }
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 64px; }
        .step-num {
          font-family: 'Instrument Serif', serif; font-style: italic;
          font-size: 80px; font-weight: 400; letter-spacing: -0.04em;
          color: rgba(255,255,255,0.06); line-height: 1; margin-bottom: 16px;
        }
        .step h3 { font-size: 18px; font-weight: 600; color: white; margin-bottom: 10px; letter-spacing: -0.02em; }
        .step p { font-size: 14px; color: var(--muted); line-height: 1.7; font-weight: 300; }
        .step-divider { width: 32px; height: 2px; background: var(--emerald); margin-bottom: 20px; border-radius: 2px; }

        /* Pricing */
        .pricing-card {
          background: white; border: 1px solid #e8e4dc;
          border-radius: 20px; padding: 40px; max-width: 620px; margin: 48px auto 0;
          box-shadow: 0 4px 60px rgba(0,0,0,0.06);
        }
        .pricing-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .pricing-badge {
          background: rgba(0,200,122,0.08); color: var(--emerald-dim);
          border: 1px solid rgba(0,200,122,0.2);
          font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 100px;
          letter-spacing: 0.02em;
        }
        .pricing-price { font-family: 'Instrument Serif', serif; font-size: 42px; font-weight: 400; color: #0d1e30; letter-spacing: -0.04em; line-height: 1; }
        .pricing-price span { font-family: 'DM Sans', sans-serif; font-size: 15px; color: #9ca3af; font-weight: 300; }
        .features-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0 32px; }
        .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #374151; font-weight: 400; }
        .check-icon { width: 18px; height: 18px; background: rgba(0,200,122,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .check-icon svg { width: 10px; height: 10px; stroke: var(--emerald); stroke-width: 3; fill: none; }
        .pricing-cta {
          display: block; width: 100%;
          background: var(--navy); color: white;
          font-weight: 600; font-size: 14px; text-align: center;
          padding: 15px; border-radius: 12px; text-decoration: none;
          transition: background 0.15s, transform 0.1s; letter-spacing: -0.01em;
        }
        .pricing-cta:hover { background: var(--navy-3); }
        .pricing-cta:active { transform: scale(0.98); }

        /* Contact */
        .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
        .contact-card {
          border-radius: 18px; padding: 32px 28px;
          text-decoration: none; display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .contact-card:hover { transform: translateY(-4px); }
        .contact-card.c-email { background: white; border: 1px solid #e8e4dc; box-shadow: 0 2px 20px rgba(0,0,0,0.04); }
        .contact-card.c-email:hover { box-shadow: 0 12px 50px rgba(0,0,0,0.1); }
        .contact-card.c-phone { background: var(--navy); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 2px 20px rgba(0,0,0,0.15); }
        .contact-card.c-phone:hover { box-shadow: 0 12px 50px rgba(0,0,0,0.3); }
        .contact-card.c-demo { background: white; border: 1px solid #e8e4dc; box-shadow: 0 2px 20px rgba(0,0,0,0.04); }
        .contact-card.c-demo:hover { box-shadow: 0 12px 50px rgba(0,0,0,0.1); }
        .contact-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        }
        .contact-icon svg { width: 20px; height: 20px; stroke-width: 1.8; }
        .contact-card h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 8px; }
        .contact-card p { font-size: 14px; line-height: 1.65; font-weight: 300; flex: 1; margin-bottom: 20px; }
        .contact-link { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .contact-link svg { width: 13px; height: 13px; stroke-width: 2.5; transition: transform 0.2s; }
        .contact-card:hover .contact-link svg { transform: translateX(3px); }

        /* Footer */
        .footer { background: var(--navy); border-top: 1px solid rgba(255,255,255,0.07); padding: 32px; }
        .footer-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .footer-logo { display: flex; align-items: center; gap: 9px; }
        .footer-logo-mark { width: 28px; height: 28px; background: var(--emerald); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
        .footer-logo-mark svg { width: 13px; height: 13px; stroke: #080f1a; fill: none; stroke-width: 2.5; stroke-linecap: round; }
        .footer-logo-text { color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { color: rgba(255,255,255,0.3); font-size: 13px; text-decoration: none; transition: color 0.15s; }
        .footer-links a:hover { color: rgba(255,255,255,0.6); }
        .footer-copy { color: rgba(255,255,255,0.2); font-size: 12px; }

        @media (max-width: 768px) {
          .problem-grid, .features-grid, .steps-grid, .contact-grid { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); }
          .features-list { grid-template-columns: 1fr; }
          .nav-links { display: none; }
          .footer-inner { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="nav-logo-mark">
              <svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="nav-logo-text">PoolControl.ai</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-actions">
            <Link href="/auth/login" className="nav-signin">Sign in</Link>
            <a href="#contact" className="btn-primary">Start free trial</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero hero-bg">
        <div style={{maxWidth: 900, margin: '0 auto', position: 'relative'}}>
          <div className="hero-eyebrow hero-tag">
            <span className="hero-eyebrow-dot" />
            Built for aquatic facility directors
          </div>
          <h1 className="hero-h1">
            The liability risk is real.<br />
            <em>The solution is here.</em>
          </h1>
          <p className="hero-sub">PoolControl.ai is the AI-powered audit and compliance platform for water parks and aquatic facilities. Structured evaluations, automated remediation, and real-time coaching — all in one place.</p>
          <div className="hero-cta-group hero-ctas">
            <a href="#contact" className="cta-main">
              Start your 14-day free trial
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="tel:+19406003636" className="cta-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.05 1.2 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14v2.92z"/></svg>
              (940) 600-3636
            </a>
          </div>
          <p className="hero-disclaimer">No credit card required · 14 days free · Cancel anytime</p>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[
            {v: '14-day', l: 'Free trial'},
            {v: '7 types', l: 'Audit formats'},
            {v: 'Real-time', l: 'AI coaching'},
            {v: '100%', l: 'Audit documentation'},
          ].map(s => (
            <div key={s.l}>
              <div className="stat-value">{s.v}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section className="section" style={{background: 'var(--cream)'}}>
        <div className="section-inner">
          <p className="section-eyebrow reveal">The problem</p>
          <h2 className="section-h2 reveal reveal-delay-1">One incident without documentation<br />changes everything.</h2>
          <p className="section-sub reveal reveal-delay-2">Most aquatic facilities are one lawsuit away from consequences they can&apos;t defend — not from lack of training, but lack of proof.</p>
          <div className="problem-grid">
            {[
              {
                color: '#fff1f0', stroke: '#ef4444',
                title: 'No defensible audit trail',
                body: "When an incident happens, can you prove your guards were properly evaluated? Clipboards and spreadsheets don't hold up in court.",
                icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01'
              },
              {
                color: '#fffbeb', stroke: '#f59e0b',
                title: 'Remediation falls through',
                body: "A guard fails an audit. A note gets written. Nothing changes. Without structured follow-through, failures repeat — and liability compounds.",
                icon: 'M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z M12 6v6l4 2'
              },
              {
                color: '#eff6ff', stroke: '#3b82f6',
                title: 'No visibility into trends',
                body: "You can't improve what you can't measure. Most facilities have no idea which guards are declining until it's too late to intervene.",
                icon: 'M18 20V10 M12 20V4 M6 20v-6'
              },
            ].map((c, i) => (
              <div key={c.title} className={`problem-card reveal reveal-delay-${i+1}`}>
                <div className="problem-icon" style={{background: c.color}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {c.icon.split(' M').map((d, j) => <path key={j} d={j === 0 ? d : 'M' + d} />)}
                  </svg>
                </div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section" style={{background: 'white'}}>
        <div className="section-inner">
          <div style={{textAlign: 'center', maxWidth: 560, margin: '0 auto'}}>
            <p className="section-eyebrow reveal">Platform</p>
            <h2 className="section-h2 reveal reveal-delay-1">Everything your facility needs<br />to stay protected.</h2>
          </div>
          <div className="features-grid">
            {[
              {
                title: 'Structured Audits',
                body: '7 audit types — zone scanning, VAT, CPR, dispatch, and more. Every evaluation timestamped and stored permanently.',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12l2 2 4-4'
              },
              {
                title: 'AI Coaching — Coach PC',
                body: "Real-time AI guidance during audits. Pulls each guard's failure history to surface the most relevant coaching points in the moment.",
                icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2z M12 8v4l3 3'
              },
              {
                title: 'Remediation Tracking',
                body: 'Failed audits auto-generate tasks with deadlines. Track status from assignment through resolution with full accountability.',
                icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'
              },
              {
                title: 'Team Analytics',
                body: 'Pass rates, failure patterns, LPR scores, and 30-day trends. Know who needs attention before an incident happens.',
                icon: 'M18 20V10 M12 20V4 M6 20v-6'
              },
              {
                title: 'Instant Failure Alerts',
                body: 'Slack and Teams webhooks fire the moment a guard fails. Your entire management team knows in real time.',
                icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0'
              },
              {
                title: 'Cert Expiry Tracking',
                body: 'Per-guard certification tracking with automated alerts at 30, 14, 7, and 1 day out. No guard slips through expired.',
                icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
              },
            ].map((f, i) => (
              <div key={f.title} className={`feature-card reveal reveal-delay-${(i % 3) + 1}`}>
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon.split(' M').map((d, j) => <path key={j} d={j === 0 ? d : 'M' + d} />)}
                  </svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="section dark-section">
        <div className="section-inner">
          <div style={{textAlign: 'center', maxWidth: 520, margin: '0 auto'}}>
            <p className="section-eyebrow reveal" style={{color: 'rgba(0,200,122,0.7)'}}>Process</p>
            <h2 className="section-h2 light reveal reveal-delay-1">Up and running<br />in one day.</h2>
          </div>
          <div className="steps-grid">
            {[
              {n: '01', t: 'We set you up', b: "We onboard your facility, import your roster, and configure your audit cadence. White-glove setup — no IT required from your side."},
              {n: '02', t: 'Supervisors audit', b: "Open the schedule, select a guard, run the audit. Coach PC guides them in real time. The whole evaluation takes under 5 minutes."},
              {n: '03', t: 'You stay protected', b: "Every audit is logged, every failure tracked, every remediation documented. Your liability exposure drops from the moment you go live."},
            ].map((s, i) => (
              <div key={s.t} className={`step reveal reveal-delay-${i+1}`}>
                <div className="step-num">{s.n}</div>
                <div className="step-divider" />
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section" style={{background: 'var(--cream)'}}>
        <div className="section-inner" style={{textAlign: 'center'}}>
          <p className="section-eyebrow reveal">Pricing</p>
          <h2 className="section-h2 reveal reveal-delay-1">Simple. No surprises.</h2>
          <p className="section-sub reveal reveal-delay-2" style={{margin: '0 auto'}}>Start with a 14-day free trial. When you&apos;re ready to continue, we send a contract and get you fully set up. Annual facility pricing.</p>
          <div className="pricing-card reveal reveal-delay-2">
            <div className="pricing-header">
              <div>
                <div style={{fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8}}>Professional</div>
                <div className="pricing-price">Contact us<br /><span>per facility · annual</span></div>
              </div>
              <span className="pricing-badge">14 days free</span>
            </div>
            <div className="features-list">
              {['Unlimited lifeguards','All 7 audit types','AI coaching (Coach PC)','Remediation tracking','Team analytics','Cert expiry alerts','Slack & Teams alerts','White-glove onboarding'].map(f => (
                <div key={f} className="feature-item">
                  <div className="check-icon">
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <a href="#contact" className="pricing-cta">Start your free trial →</a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="section" style={{background: 'white'}}>
        <div className="section-inner" style={{textAlign: 'center'}}>
          <p className="section-eyebrow reveal">Get started</p>
          <h2 className="section-h2 reveal reveal-delay-1">Ready to protect<br />your facility?</h2>
          <p className="section-sub reveal reveal-delay-2" style={{margin: '0 auto 0'}}>Choose how you&apos;d like to begin. We personally onboard every new facility.</p>
          <div className="contact-grid" style={{marginTop: 48}}>
            <a href="mailto:hello@poolcontrol.ai?subject=Start Free Trial&body=Hi, I'd like to start a free trial.%0A%0AFacility name:%0AYour name:%0APhone:" className="contact-card c-email">
              <div className="contact-icon" style={{background: 'rgba(0,200,122,0.08)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--emerald-dim)" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h3 style={{color: '#111'}}>Start Free Trial</h3>
              <p style={{color: '#6b7280'}}>Email us and we&apos;ll have your facility set up within 24 hours.</p>
              <span className="contact-link" style={{color: 'var(--emerald-dim)'}}>
                hello@poolcontrol.ai
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>

            <a href="tel:+19406003636" className="contact-card c-phone">
              <div className="contact-icon" style={{background: 'rgba(0,200,122,0.15)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.574 2.81.7A2 2 0 0122 16v.92z"/></svg>
              </div>
              <h3 style={{color: 'white'}}>Book a Call</h3>
              <p style={{color: 'var(--muted)'}}>Talk directly with our team. We&apos;ll walk you through the platform live.</p>
              <span className="contact-link" style={{color: 'var(--emerald)'}}>
                (940) 600-3636
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>

            <a href="mailto:hello@poolcontrol.ai?subject=Request a Demo&body=Hi, I'd like to schedule a demo.%0A%0AFacility name:%0AYour name:%0AAvailability:" className="contact-card c-demo">
              <div className="contact-icon" style={{background: '#eff6ff'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h3 style={{color: '#111'}}>Request a Demo</h3>
              <p style={{color: '#6b7280'}}>See PoolControl.ai in action with a personalized walkthrough of your use case.</p>
              <span className="contact-link" style={{color: '#3b82f6'}}>
                Schedule a demo
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="footer-logo-mark">
              <svg viewBox="0 0 24 24" strokeLinecap="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="footer-logo-text">PoolControl.ai</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="mailto:hello@poolcontrol.ai">Contact</a>
            <Link href="/auth/login">Sign in</Link>
          </div>
          <span className="footer-copy">© {new Date().getFullYear()} PoolControl.ai</span>
        </div>
      </footer>

      {/* Scroll reveal script */}
      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          var els = document.querySelectorAll('.reveal');
          if(!els.length) return;
          var io = new IntersectionObserver(function(entries){
            entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
          }, {threshold: 0.12});
          els.forEach(function(el){ io.observe(el); });
        })();
      `}} />
    </>
  )
}
