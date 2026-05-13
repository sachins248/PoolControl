import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ScrollReveal from '@/components/scroll-reveal'

export default async function RootPage() {
  const profile = await getServerUser()
  if (profile) {
    if (profile.role === 'lifeguard') redirect('/my-profile')
    if (profile.role === 'corporate') redirect('/dashboard')
    redirect('/schedule')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #06101c;
          --navy-2: #0d1e30;
          --emerald: #00c87a;
          --emerald-light: #00e88d;
          --slate: #f4f6f9;
          --border: #e4e7ec;
          --text-dark: #0d1e30;
          --text-body: #4b5563;
          --text-light: rgba(255,255,255,0.55);
          --white: #ffffff;
        }

        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--white);
          color: var(--text-dark);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        a { text-decoration: none; }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .hero-tag  { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .hero-h1   { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
        .hero-sub  { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
        .hero-ctas { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.44s both; }
        .hero-stats { animation: fadeIn 0.8s ease 0.7s both; }

        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-d1 { transition-delay: 0.08s; }
        .reveal-d2 { transition-delay: 0.16s; }
        .reveal-d3 { transition-delay: 0.24s; }
        .reveal-d4 { transition-delay: 0.32s; }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(6,16,28,0.96);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 40px; height: 62px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo { display: flex; align-items: center; gap: 9px; }
        .nav-mark {
          width: 32px; height: 32px; background: var(--emerald); border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-mark svg { width: 15px; height: 15px; stroke: white; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .nav-name { color: white; font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-links a { color: rgba(255,255,255,0.48); font-size: 13.5px; font-weight: 400; transition: color 0.15s; }
        .nav-links a:hover { color: rgba(255,255,255,0.9); }
        .nav-actions { display: flex; align-items: center; gap: 8px; }
        .nav-signin { color: rgba(255,255,255,0.5); font-size: 13.5px; font-weight: 500; padding: 7px 14px; transition: color 0.15s; }
        .nav-signin:hover { color: white; }
        .nav-demo {
          background: var(--emerald); color: #06101c; font-size: 13px; font-weight: 700;
          padding: 8px 18px; border-radius: 7px; letter-spacing: -0.01em;
          transition: background 0.12s, transform 0.1s;
        }
        .nav-demo:hover { background: var(--emerald-light); }
        .nav-demo:active { transform: scale(0.97); }

        /* ── Hero ── */
        .hero {
          background: var(--navy);
          background-image:
            radial-gradient(ellipse 70% 60% at 65% -5%, rgba(0,200,122,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 5% 95%, rgba(0,80,200,0.07) 0%, transparent 55%);
          padding: 88px 40px 80px;
          text-align: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(0,200,122,0.08); border: 1px solid rgba(0,200,122,0.22);
          color: var(--emerald); font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          padding: 5px 13px; border-radius: 100px; margin-bottom: 24px;
        }
        .hero-dot { width: 5px; height: 5px; background: var(--emerald); border-radius: 50%; }
        .hero h1 {
          font-family: 'Instrument Serif', serif; font-style: italic;
          font-size: clamp(44px, 6.5vw, 78px); font-weight: 400;
          color: white; line-height: 1.06; letter-spacing: -0.03em;
          max-width: 860px; margin: 0 auto 20px;
        }
        .hero h1 em {
          font-style: italic;
          background: linear-gradient(120deg, var(--emerald) 0%, #00f59b 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          color: rgba(255,255,255,0.48); font-size: 16.5px; line-height: 1.68;
          max-width: 500px; margin: 0 auto 36px; font-weight: 300;
        }
        .hero-btns { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .btn-hero-primary {
          background: var(--emerald); color: #06101c;
          font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
          padding: 13px 26px; border-radius: 9px;
          box-shadow: 0 0 0 1px rgba(0,200,122,0.35), 0 6px 28px rgba(0,200,122,0.25);
          transition: background 0.12s, box-shadow 0.12s, transform 0.1s;
          display: flex; align-items: center; gap: 7px;
        }
        .btn-hero-primary:hover { background: var(--emerald-light); box-shadow: 0 0 0 1px rgba(0,200,122,0.5), 0 10px 36px rgba(0,200,122,0.32); }
        .btn-hero-primary:active { transform: scale(0.97); }
        .btn-hero-ghost {
          border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.65);
          font-size: 14px; font-weight: 500; padding: 12px 22px; border-radius: 9px;
          background: rgba(255,255,255,0.03);
          transition: border-color 0.12s, color 0.12s, transform 0.1s;
          display: flex; align-items: center; gap: 7px;
        }
        .btn-hero-ghost:hover { border-color: rgba(255,255,255,0.3); color: white; }
        .btn-hero-ghost:active { transform: scale(0.97); }
        .hero-note { color: rgba(255,255,255,0.2); font-size: 12px; margin-top: 16px; }

        /* ── Hero stats strip ── */
        .hero-stats-strip {
          max-width: 800px; margin: 56px auto 0;
          display: grid; grid-template-columns: repeat(4, 1fr);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; overflow: hidden;
          background: rgba(255,255,255,0.03);
        }
        .hstat {
          padding: 20px 16px; text-align: center;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .hstat:last-child { border-right: none; }
        .hstat-val { color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.04em; }
        .hstat-label { color: rgba(255,255,255,0.35); font-size: 11.5px; font-weight: 400; margin-top: 3px; }

        /* ── Trust strip ── */
        .trust-strip {
          background: var(--slate); border-bottom: 1px solid var(--border);
          padding: 18px 40px;
          text-align: center;
        }
        .trust-label { color: #9ca3af; font-size: 11.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 14px; }
        .trust-items { display: flex; align-items: center; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .trust-item { color: #6b7280; font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }

        /* ── Section base ── */
        .section { padding: 80px 40px; }
        .section-inner { max-width: 1120px; margin: 0 auto; }
        .eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--emerald); margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .eyebrow::before { content: ''; display: block; width: 20px; height: 2px; background: var(--emerald); border-radius: 2px; }
        .section-h2 {
          font-family: 'Instrument Serif', serif; font-style: italic;
          font-size: clamp(28px, 3.5vw, 42px); font-weight: 400;
          letter-spacing: -0.025em; line-height: 1.12;
          color: var(--text-dark); margin-bottom: 14px;
        }
        .section-h2.on-dark { color: white; }
        .section-body { color: var(--text-body); font-size: 15.5px; line-height: 1.7; font-weight: 300; max-width: 480px; }
        .section-body.on-dark { color: rgba(255,255,255,0.5); }

        /* ── Feature bullets ── */
        .feat-bullets { list-style: none; margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .feat-bullets li { display: flex; align-items: flex-start; gap: 10px; color: var(--text-body); font-size: 14.5px; line-height: 1.5; }
        .feat-bullets li::before { content: ''; display: block; width: 16px; height: 16px; min-width: 16px; margin-top: 2px; background: rgba(0,200,122,0.12); border: 1px solid rgba(0,200,122,0.3); border-radius: 4px; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 6l3 3 5-5' stroke='%2300c87a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; }

        /* ── 50/50 layout ── */
        .split { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; }
        .split.flip { direction: rtl; }
        .split.flip > * { direction: ltr; }

        /* ── App mockups ── */
        .mockup-wrap {
          background: #f8fafc; border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
        }
        .mockup-bar {
          background: white; border-bottom: 1px solid var(--border);
          padding: 10px 16px; display: flex; align-items: center; gap: 6px;
        }
        .dot-r { width: 10px; height: 10px; background: #ff5f57; border-radius: 50%; }
        .dot-y { width: 10px; height: 10px; background: #febc2e; border-radius: 50%; }
        .dot-g { width: 10px; height: 10px; background: #28c840; border-radius: 50%; }
        .mockup-body { padding: 20px; }

        /* Audit mockup */
        .audit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .audit-title-block h4 { font-size: 14px; font-weight: 600; color: var(--text-dark); letter-spacing: -0.01em; }
        .audit-title-block p { font-size: 12px; color: #9ca3af; margin-top: 1px; }
        .audit-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; }
        .badge-in-progress { background: #fef3c7; color: #92400e; }
        .audit-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: white; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; }
        .audit-row-label { font-size: 13px; color: var(--text-dark); font-weight: 400; }
        .pass-chip { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 100px; }
        .chip-pass { background: #dcfce7; color: #15803d; }
        .chip-fail { background: #fee2e2; color: #b91c1c; }
        .chip-na { background: #f3f4f6; color: #6b7280; }
        .audit-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
        .score-block { font-size: 13px; color: #6b7280; }
        .score-block strong { color: var(--text-dark); font-size: 15px; font-weight: 700; }
        .coach-btn { background: var(--navy); color: white; font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 7px; display: flex; align-items: center; gap: 6px; }
        .coach-btn-star { color: var(--emerald); font-size: 14px; }

        /* Coach PC mockup */
        .coach-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .coach-avatar { width: 34px; height: 34px; background: linear-gradient(135deg, var(--navy) 0%, #1a4060 100%); border-radius: 9px; display: flex; align-items: center; justify-content: center; }
        .coach-avatar svg { width: 16px; height: 16px; stroke: var(--emerald); fill: none; stroke-width: 2; stroke-linecap: round; }
        .coach-name { font-size: 13px; font-weight: 600; color: var(--text-dark); letter-spacing: -0.01em; }
        .coach-sub { font-size: 11px; color: #9ca3af; }
        .coach-bubble { background: var(--slate); border-radius: 0 10px 10px 10px; padding: 12px 14px; font-size: 13px; color: var(--text-body); line-height: 1.55; margin-bottom: 8px; }
        .coach-context { background: rgba(0,200,122,0.06); border: 1px solid rgba(0,200,122,0.18); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #374151; margin-top: 10px; }
        .coach-context strong { color: var(--text-dark); }

        /* Analytics mockup */
        .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .astat { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .astat-val { font-size: 22px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.04em; line-height: 1; }
        .astat-label { font-size: 11px; color: #9ca3af; margin-top: 4px; font-weight: 400; }
        .astat-delta { font-size: 11px; font-weight: 600; margin-top: 4px; }
        .delta-up { color: #16a34a; }
        .delta-down { color: #dc2626; }
        .chart-wrap { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .chart-label { font-size: 11px; color: #9ca3af; margin-bottom: 10px; font-weight: 500; }
        .chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 52px; }
        .bar { flex: 1; background: rgba(0,200,122,0.15); border-radius: 3px 3px 0 0; transition: background 0.2s; }
        .bar:hover { background: rgba(0,200,122,0.35); }
        .bar.current { background: var(--emerald); }
        .remediation-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .rem-row { display: flex; align-items: center; justify-content: space-between; background: white; border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; }
        .rem-name { font-size: 12.5px; font-weight: 500; color: var(--text-dark); }
        .rem-type { font-size: 11px; color: #9ca3af; }
        .rem-badge { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 100px; background: #fee2e2; color: #b91c1c; }
        .rem-badge.warn { background: #fef3c7; color: #92400e; }

        /* ── Metrics band ── */
        .metrics-band { background: var(--navy); padding: 72px 40px; }
        .metrics-inner { max-width: 1000px; margin: 0 auto; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .metric-cell { background: var(--navy); padding: 36px 28px; text-align: center; }
        .metric-val { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 48px; color: white; line-height: 1; letter-spacing: -0.04em; }
        .metric-val span { font-family: 'DM Sans', sans-serif; font-style: normal; font-size: 24px; }
        .metric-label { color: rgba(255,255,255,0.38); font-size: 13px; font-weight: 400; margin-top: 8px; line-height: 1.4; }

        /* ── How it works ── */
        .steps-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 56px; position: relative; }
        .steps-row::before { content: ''; position: absolute; top: 24px; left: calc(16.66% + 24px); right: calc(16.66% + 24px); height: 1px; background: var(--border); }
        .step { text-align: center; }
        .step-num { width: 48px; height: 48px; background: var(--navy); color: white; font-size: 15px; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; position: relative; z-index: 1; letter-spacing: -0.02em; }
        .step h3 { font-size: 16px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; letter-spacing: -0.02em; }
        .step p { color: var(--text-body); font-size: 14px; line-height: 1.6; font-weight: 300; }

        /* ── Pricing ── */
        .pricing-card {
          max-width: 540px; margin: 48px auto 0;
          background: white; border: 1px solid var(--border);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.07);
        }
        .pricing-top { padding: 32px 36px 24px; border-bottom: 1px solid var(--border); }
        .pricing-plan { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px; }
        .pricing-title { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; font-weight: 400; color: var(--text-dark); letter-spacing: -0.02em; }
        .pricing-sub { color: var(--text-body); font-size: 14px; margin-top: 6px; font-weight: 300; }
        .pricing-trial { display: inline-flex; align-items: center; gap: 6px; background: rgba(0,200,122,0.08); border: 1px solid rgba(0,200,122,0.2); color: #059669; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; margin-top: 14px; }
        .pricing-features { padding: 24px 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pricing-feat { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-body); }
        .pf-check { width: 16px; height: 16px; min-width: 16px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .pf-check svg { width: 9px; height: 9px; stroke: #16a34a; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .pricing-footer { padding: 20px 36px 28px; }
        .pricing-cta {
          display: block; text-align: center;
          background: var(--navy); color: white;
          font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
          padding: 14px; border-radius: 10px;
          transition: background 0.12s, transform 0.1s;
        }
        .pricing-cta:hover { background: #1a3050; }
        .pricing-cta:active { transform: scale(0.98); }

        /* ── CTA band ── */
        .cta-band {
          background: var(--emerald);
          padding: 72px 40px;
          text-align: center;
        }
        .cta-band h2 { font-family: 'Instrument Serif', serif; font-style: italic; font-size: clamp(28px, 3.5vw, 40px); color: #06101c; font-weight: 400; letter-spacing: -0.025em; margin-bottom: 10px; }
        .cta-band p { color: rgba(6,16,28,0.55); font-size: 15px; margin-bottom: 30px; font-weight: 300; }
        .cta-band-btns { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .band-btn-primary { background: #06101c; color: white; font-size: 14px; font-weight: 700; padding: 13px 26px; border-radius: 9px; transition: background 0.12s, transform 0.1s; }
        .band-btn-primary:hover { background: #1a3050; }
        .band-btn-primary:active { transform: scale(0.97); }
        .band-btn-ghost { background: rgba(6,16,28,0.1); color: #06101c; font-size: 14px; font-weight: 600; padding: 13px 24px; border-radius: 9px; transition: background 0.12s, transform 0.1s; }
        .band-btn-ghost:hover { background: rgba(6,16,28,0.18); }
        .band-btn-ghost:active { transform: scale(0.97); }

        /* ── Contact cards ── */
        .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 920px; margin: 48px auto 0; }
        .contact-card { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 28px 24px; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
        .contact-card:hover { border-color: #c7d2de; box-shadow: 0 8px 32px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .contact-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .contact-icon svg { width: 20px; height: 20px; }
        .contact-card h3 { font-size: 15px; font-weight: 600; color: var(--text-dark); margin-bottom: 6px; letter-spacing: -0.01em; }
        .contact-card p { font-size: 13.5px; color: var(--text-body); line-height: 1.55; font-weight: 300; margin-bottom: 16px; }
        .contact-link { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; }
        .contact-link svg { width: 14px; height: 14px; }

        /* ── Footer ── */
        .footer { background: var(--navy); padding: 40px; border-top: 1px solid rgba(255,255,255,0.06); }
        .footer-inner { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { display: flex; align-items: center; gap: 8px; }
        .footer-logo-mark { width: 28px; height: 28px; background: var(--emerald); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
        .footer-logo-mark svg { width: 13px; height: 13px; stroke: white; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .footer-name { color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500; }
        .footer-copy { color: rgba(255,255,255,0.2); font-size: 12.5px; }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { color: rgba(255,255,255,0.28); font-size: 13px; transition: color 0.15s; }
        .footer-links a:hover { color: rgba(255,255,255,0.6); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-inner { padding: 0 20px; }
          .hero { padding: 64px 20px 60px; }
          .hero-stats-strip { grid-template-columns: repeat(2, 1fr); }
          .section { padding: 56px 20px; }
          .split { grid-template-columns: 1fr; gap: 40px; }
          .split.flip { direction: ltr; }
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .steps-row { grid-template-columns: 1fr; gap: 32px; }
          .steps-row::before { display: none; }
          .contact-grid { grid-template-columns: 1fr; }
          .pricing-features { grid-template-columns: 1fr; }
          .trust-items { gap: 20px; }
          .footer-inner { flex-direction: column; gap: 16px; text-align: center; }
          .footer-links { justify-content: center; }
          .cta-band { padding: 56px 20px; }
        }
      ` }} />

      <ScrollReveal />

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <img src="/logo.jpeg" alt="PoolControl.ai" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}} />
            <span className="nav-name">PoolControl.ai</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <a href="/auth/login" className="nav-signin">Sign in</a>
            <a href="mailto:hello@poolcontrol.ai?subject=Request a Demo&body=Hi, I&apos;d like to schedule a demo.%0A%0AFacility name:%0AYour name:%0AAvailability:" className="nav-demo">Request demo</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero hero-bg">
        <div className="hero-badge hero-tag">
          <span className="hero-dot" />
          Built for aquatic facility compliance
        </div>
        <h1 className="hero-h1">
          The audit platform that keeps<br /><em>your facility protected.</em>
        </h1>
        <p className="hero-sub hero-sub">
          Document every evaluation. Track every failure. Prove you&apos;re running a safe facility — before you ever need to.
        </p>
        <div className="hero-btns hero-ctas">
          <a href="mailto:hello@poolcontrol.ai?subject=Start Free Trial&body=Hi, I&apos;d like to start a 14-day free trial.%0A%0AFacility name:%0AYour name:%0APhone:" className="btn-hero-primary">
            Start free trial
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="tel:+19406003636" className="btn-hero-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.574 2.81.7A2 2 0 0122 16v.92z"/></svg>
            Talk to us — (940) 600-3636
          </a>
        </div>
        <p className="hero-note">14-day free trial · No credit card · White-glove setup</p>

        <div className="hero-stats-strip hero-stats">
          <div className="hstat"><div className="hstat-val">5 min</div><div className="hstat-label">Average audit time</div></div>
          <div className="hstat"><div className="hstat-val">7</div><div className="hstat-label">Audit types built in</div></div>
          <div className="hstat"><div className="hstat-val">100%</div><div className="hstat-label">Tamper-proof audit log</div></div>
          <div className="hstat"><div className="hstat-val">&lt;24hr</div><div className="hstat-label">Typical setup time</div></div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="trust-strip">
        <p className="trust-label">Trusted by aquatic facilities managing lifeguard teams</p>
        <div className="trust-items">
          {['Water Parks','Municipal Pools','Resort Facilities','Recreation Centers','Aquatic Centers'].map(t => (
            <span key={t} className="trust-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Feature 1: Structured Audits ── */}
      <section id="features" className="section" style={{background: 'white'}}>
        <div className="section-inner">
          <div className="split">
            <div>
              <p className="eyebrow reveal">Structured Audits</p>
              <h2 className="section-h2 reveal reveal-d1">Every evaluation documented.<br />Every time.</h2>
              <p className="section-body reveal reveal-d2">Seven standardized audit types — zone scanning, VAT, CPR, dispatch, EAVS, guest service, and cleaning. Every evaluation is timestamped and permanently stored.</p>
              <ul className="feat-bullets reveal reveal-d3">
                <li>Run full audits in under 5 minutes from any device</li>
                <li>Criteria-based scoring with instant pass/fail results</li>
                <li>Automatic Slack and Teams alerts on failed audits</li>
                <li>Immutable audit trail — tamper-proof and court-ready</li>
              </ul>
            </div>
            <div className="reveal reveal-d2">
              <div className="mockup-wrap">
                <div className="mockup-bar"><div className="dot-r"/><div className="dot-y"/><div className="dot-g"/></div>
                <div className="mockup-body">
                  <div className="audit-header">
                    <div className="audit-title-block">
                      <h4>Zone Scanning Audit</h4>
                      <p>Jordan Martinez &nbsp;·&nbsp; Pool A &nbsp;·&nbsp; Today 2:14 PM</p>
                    </div>
                    <span className="audit-badge badge-in-progress">In Progress</span>
                  </div>
                  {[
                    ['Clear water visibility throughout zone', 'pass'],
                    ['10/20 scanning pattern maintained', 'pass'],
                    ['Response readiness check', 'fail'],
                    ['Rescue equipment present & accessible', 'pass'],
                    ['Zone overlap with adjacent guard', 'n/a'],
                  ].map(([label, result]) => (
                    <div key={label} className="audit-row">
                      <span className="audit-row-label">{label}</span>
                      <span className={`pass-chip ${result === 'pass' ? 'chip-pass' : result === 'fail' ? 'chip-fail' : 'chip-na'}`}>
                        {result === 'pass' ? 'Pass' : result === 'fail' ? 'Fail' : 'N/A'}
                      </span>
                    </div>
                  ))}
                  <div className="audit-footer">
                    <div className="score-block">Score: <strong>78%</strong></div>
                    <div className="coach-btn"><span className="coach-btn-star">✦</span> Ask Coach PC</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 2: Coach PC ── */}
      <section className="section" style={{background: 'var(--slate)'}}>
        <div className="section-inner">
          <div className="split flip">
            <div>
              <p className="eyebrow reveal">AI Coaching</p>
              <h2 className="section-h2 reveal reveal-d1">Real-time guidance.<br />Every evaluation.</h2>
              <p className="section-body reveal reveal-d2">Coach PC pulls each guard&apos;s full failure history and surfaces the most relevant coaching points the moment a supervisor needs them — no manual prep required.</p>
              <ul className="feat-bullets reveal reveal-d3">
                <li>Context-aware: references each guard&apos;s recent audit history</li>
                <li>Streams live responses during the audit — no waiting</li>
                <li>Generates post-audit coaching points automatically</li>
                <li>Produces targeted team training plans from performance data</li>
              </ul>
            </div>
            <div className="reveal reveal-d2">
              <div className="mockup-wrap">
                <div className="mockup-bar"><div className="dot-r"/><div className="dot-y"/><div className="dot-g"/></div>
                <div className="mockup-body">
                  <div className="coach-header">
                    <div className="coach-avatar">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    </div>
                    <div>
                      <div className="coach-name">Coach PC</div>
                      <div className="coach-sub">AI Coaching Assistant</div>
                    </div>
                  </div>
                  <div className="coach-bubble">
                    Jordan failed the response readiness check today. Looking at their history over the last 45 days, this is their third failure on response time — all within the 2–4 PM window when pool traffic peaks.
                  </div>
                  <div className="coach-bubble">
                    I&apos;d recommend a focused drill on mental readiness and activation speed before their next shift. The pattern suggests attention drift, not skill gaps.
                  </div>
                  <div className="coach-context">
                    <strong>Guard context loaded:</strong> 8 audits in 45 days &nbsp;·&nbsp; 3 response-time failures &nbsp;·&nbsp; Last remediation: 12 days ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 3: Analytics + Remediation ── */}
      <section className="section" style={{background: 'white'}}>
        <div className="section-inner">
          <div className="split">
            <div>
              <p className="eyebrow reveal">Analytics & Remediation</p>
              <h2 className="section-h2 reveal reveal-d1">Know who needs attention<br />before an incident happens.</h2>
              <p className="section-body reveal reveal-d2">Team-wide pass rates, failure patterns, LPR scores, and 30-day trends — all in one place. Failed audits automatically create remediation tasks with deadlines and accountability.</p>
              <ul className="feat-bullets reveal reveal-d3">
                <li>Facility-wide performance dashboard with trend lines</li>
                <li>Failed audits auto-generate remediation tasks</li>
                <li>Countdown timers and status tracking on every task</li>
                <li>Certification expiry alerts at 30, 14, 7, and 1 day out</li>
              </ul>
            </div>
            <div className="reveal reveal-d2">
              <div className="mockup-wrap">
                <div className="mockup-bar"><div className="dot-r"/><div className="dot-y"/><div className="dot-g"/></div>
                <div className="mockup-body">
                  <div className="analytics-grid">
                    <div className="astat"><div className="astat-val">87%</div><div className="astat-label">Team pass rate</div><div className="astat-delta delta-up">↑ 4% this week</div></div>
                    <div className="astat"><div className="astat-val">34</div><div className="astat-label">Audits this month</div><div className="astat-delta delta-up">↑ 8 vs last</div></div>
                    <div className="astat"><div className="astat-val">3</div><div className="astat-label">Open remediations</div><div className="astat-delta delta-down">2 overdue</div></div>
                  </div>
                  <div className="chart-wrap">
                    <div className="chart-label">Pass rate — last 8 weeks</div>
                    <div className="chart-bars">
                      {[55,62,58,70,74,68,82,87].map((h, i) => (
                        <div key={i} className={`bar${i === 7 ? ' current' : ''}`} style={{height: `${h}%`}} />
                      ))}
                    </div>
                  </div>
                  <div className="remediation-list">
                    <div className="rem-row"><div><div className="rem-name">Jordan Martinez</div><div className="rem-type">Response readiness — Zone Scanning</div></div><span className="rem-badge">2 days overdue</span></div>
                    <div className="rem-row"><div><div className="rem-name">Casey Thompson</div><div className="rem-type">CPR compression depth</div></div><span className="rem-badge warn">Due today</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics band ── */}
      <div className="metrics-band">
        <div className="metrics-inner">
          <div style={{textAlign: 'center', marginBottom: 48}}>
            <p className="eyebrow reveal" style={{justifyContent: 'center', color: 'rgba(0,200,122,0.6)'}}>By the numbers</p>
            <h2 className="section-h2 on-dark reveal reveal-d1" style={{textAlign: 'center'}}>Results from day one.</h2>
          </div>
          <div className="metrics-grid">
            <div className="metric-cell reveal"><div className="metric-val">5<span>min</span></div><div className="metric-label">Average time to complete a full audit</div></div>
            <div className="metric-cell reveal reveal-d1"><div className="metric-val">100<span>%</span></div><div className="metric-label">Audit records permanently stored, never editable</div></div>
            <div className="metric-cell reveal reveal-d2"><div className="metric-val">7</div><div className="metric-label">Audit types covering every critical safety area</div></div>
            <div className="metric-cell reveal reveal-d3"><div className="metric-val">&lt;24<span>hr</span></div><div className="metric-label">From signing up to running your first live audit</div></div>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how-it-works" className="section" style={{background: 'white'}}>
        <div className="section-inner">
          <div style={{textAlign: 'center', maxWidth: 520, margin: '0 auto'}}>
            <p className="eyebrow reveal" style={{justifyContent: 'center'}}>Process</p>
            <h2 className="section-h2 reveal reveal-d1" style={{textAlign: 'center'}}>Up and running in one day.</h2>
            <p className="section-body reveal reveal-d2" style={{margin: '0 auto', textAlign: 'center'}}>We handle the entire setup. Your team starts auditing the same day you sign up.</p>
          </div>
          <div className="steps-row">
            {[
              {n: '01', t: 'We set you up', b: 'We import your roster, configure your audit cadence, and walk your managers through the platform. No IT involvement needed on your end.'},
              {n: '02', t: 'Supervisors audit', b: 'Open the schedule, select a guard, run the evaluation. Coach PC guides in real time. A complete audit takes under 5 minutes.'},
              {n: '03', t: 'You stay protected', b: 'Every audit is logged, every failure tracked, every remediation documented. Your liability exposure drops from the moment you go live.'},
            ].map((s, i) => (
              <div key={s.t} className={`step reveal reveal-d${i+1}`}>
                <div className="step-num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="section" style={{background: 'var(--slate)'}}>
        <div className="section-inner" style={{textAlign: 'center'}}>
          <p className="eyebrow reveal" style={{justifyContent: 'center'}}>Pricing</p>
          <h2 className="section-h2 reveal reveal-d1" style={{textAlign: 'center'}}>Simple. No surprises.</h2>
          <p className="section-body reveal reveal-d2" style={{margin: '0 auto', textAlign: 'center'}}>Annual contracts with white-glove onboarding. We set everything up — you just show up and audit.</p>
          <div className="pricing-card reveal reveal-d2">
            <div className="pricing-top">
              <div className="pricing-plan">Professional</div>
              <div className="pricing-title">Contact us for facility pricing</div>
              <div className="pricing-sub">Annual facility contract · Wire or ACH · Onboarding included</div>
              <div className="pricing-trial">✓ &nbsp;14-day free trial — no credit card required</div>
            </div>
            <div className="pricing-features">
              {['Unlimited lifeguards','All 7 audit types','Coach PC — AI guidance','Remediation tracking','Team analytics dashboard','Cert expiry alerts','Slack & Teams webhooks','White-glove onboarding'].map(f => (
                <div key={f} className="pricing-feat">
                  <div className="pf-check"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg></div>
                  {f}
                </div>
              ))}
            </div>
            <div className="pricing-footer">
              <a href="mailto:hello@poolcontrol.ai?subject=Start Free Trial&body=Hi, I&apos;d like to start a 14-day free trial.%0A%0AFacility name:%0AYour name:%0APhone:" className="pricing-cta">Start your 14-day free trial →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <div className="cta-band">
        <h2>Ready to protect your facility?</h2>
        <p>Join facilities that have replaced clipboards with a system that holds up under scrutiny.</p>
        <div className="cta-band-btns">
          <a href="mailto:hello@poolcontrol.ai?subject=Start Free Trial&body=Hi, I&apos;d like to start a 14-day free trial.%0A%0AFacility name:%0AYour name:%0APhone:" className="band-btn-primary">Start free trial</a>
          <a href="tel:+19406003636" className="band-btn-ghost">Call (940) 600-3636</a>
        </div>
      </div>

      {/* ── Contact ── */}
      <section id="contact" className="section" style={{background: 'white'}}>
        <div className="section-inner" style={{textAlign: 'center'}}>
          <p className="eyebrow reveal" style={{justifyContent: 'center'}}>Get started</p>
          <h2 className="section-h2 reveal reveal-d1" style={{textAlign: 'center'}}>Three ways to begin.</h2>
          <p className="section-body reveal reveal-d2" style={{margin: '0 auto', textAlign: 'center'}}>We personally onboard every new facility. Reach us however works best for you.</p>
          <div className="contact-grid">
            <a href="mailto:hello@poolcontrol.ai?subject=Start Free Trial&body=Hi, I&apos;d like to start a 14-day free trial.%0A%0AFacility name:%0AYour name:%0APhone:" className="contact-card reveal reveal-d1">
              <div className="contact-icon" style={{background: 'rgba(0,200,122,0.08)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#00a865" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h3>Start Free Trial</h3>
              <p>Email us and we&apos;ll have your facility set up within 24 hours.</p>
              <span className="contact-link" style={{color: '#00a865'}}>
                hello@poolcontrol.ai
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
            <a href="tel:+19406003636" className="contact-card reveal reveal-d2">
              <div className="contact-icon" style={{background: 'rgba(0,200,122,0.15)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#00c87a" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.574 2.81.7A2 2 0 0122 16v.92z"/></svg>
              </div>
              <h3>Book a Call</h3>
              <p>Speak directly with our team. We&apos;ll walk you through the platform live.</p>
              <span className="contact-link" style={{color: '#00c87a'}}>
                (940) 600-3636
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
            <a href="mailto:hello@poolcontrol.ai?subject=Request a Demo&body=Hi, I&apos;d like to schedule a demo.%0A%0AFacility name:%0AYour name:%0AAvailability:" className="contact-card reveal reveal-d3">
              <div className="contact-icon" style={{background: '#eff6ff'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <h3>Request a Demo</h3>
              <p>See PoolControl.ai in action with a live walkthrough of your use case.</p>
              <span className="contact-link" style={{color: '#3b82f6'}}>
                Schedule a demo
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src="/logo.jpeg" alt="PoolControl.ai" style={{width:28,height:28,borderRadius:7,objectFit:'cover'}} />
            <span className="footer-name">PoolControl.ai</span>
          </div>
          <span className="footer-copy">© {new Date().getFullYear()} PoolControl.ai · Aquatics Performance Platform</span>
          <div className="footer-links">
            <a href="mailto:hello@poolcontrol.ai">Contact</a>
            <a href="/auth/login">Sign in</a>
          </div>
        </div>
      </footer>
    </>
  )
}
