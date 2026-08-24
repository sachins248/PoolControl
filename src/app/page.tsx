import './landing.css'
import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LandingFx from '@/components/landing-fx'
import MobileNav from '@/components/mobile-nav'

const MAIL_TRIAL =
  "mailto:poolcontrolnate@gmail.com?subject=Start Free Trial&body=Hi, I'd like to start a 14-day free trial.%0A%0AFacility name:%0AYour name:%0APhone:"
const MAIL_DEMO =
  "mailto:poolcontrolnate@gmail.com?subject=Request a Demo&body=Hi, I'd like to schedule a demo.%0A%0AFacility name:%0AYour name:%0AAvailability:"
const TEL = 'tel:+19406003636'

/* Letter-by-letter "surfacing" headline */
function Rise({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="dp-rise-word" aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} className="dp-rise-clip" aria-hidden="true">
          <span
            className="dp-rise-letter"
            style={{ animationDelay: `${delay + i * 0.04}s` }}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        </span>
      ))}
    </span>
  )
}

function Ticks() {
  return (
    <>
      <i className="dp-tick dp-tick-tl" aria-hidden="true" />
      <i className="dp-tick dp-tick-tr" aria-hidden="true" />
      <i className="dp-tick dp-tick-bl" aria-hidden="true" />
      <i className="dp-tick dp-tick-br" aria-hidden="true" />
    </>
  )
}

function SectionTag({ depth, code, title }: { depth: string; code: string; title: string }) {
  return (
    <div className="dp-sect-tag dp-reveal">
      <span className="dp-sect-depth">DEPTH {depth}</span>
      <span className="dp-sect-rule" aria-hidden="true" />
      <span className="dp-sect-title">{code} / {title}</span>
    </div>
  )
}

function Check() {
  return (
    <span className="dp-check" aria-hidden="true">
      <svg viewBox="0 0 12 12"><polyline points="2 7 5 10 10 3" /></svg>
    </span>
  )
}

const FEED = [
  ['14:02:31', 'ZONE SCAN', 'J. MARTINEZ', 'PASS'],
  ['14:11:08', 'VAT DROP', 'POOL B', 'PASS'],
  ['14:19:47', 'CPR EVAL', 'C. THOMPSON', 'FAIL'],
  ['14:20:02', 'REMEDIATION', 'AUTO-ISSUED', 'OPEN'],
  ['14:31:55', 'DISPATCH', 'TOWER 3', 'PASS'],
  ['14:44:12', 'EAVS', 'WAVE POOL', 'PASS'],
  ['14:52:36', 'GUEST SVC', 'K. OKAFOR', 'PASS'],
  ['15:01:19', 'CLEANING', 'DECK NORTH', 'PASS'],
  ['15:09:44', 'ZONE SCAN', 'R. DELGADO', 'FAIL'],
  ['15:09:51', 'COACH PC', 'BRIEF READY', 'LIVE'],
] as const

export default async function RootPage() {
  const profile = await getServerUser()
  if (profile) {
    if (profile.role === 'lifeguard') redirect('/my-profile')
    if (profile.role === 'corporate') redirect('/dashboard')
    if (profile.role === 'super_admin') redirect('/admin')
    redirect('/schedule')
  }

  const year = new Date().getFullYear()

  const feedRow = (key: string) => (
    <div className="dp-feed-track" aria-hidden={key === 'b'} key={key}>
      {FEED.map(([t, type, who, res], i) => (
        <span className="dp-feed-item" key={`${key}-${i}`}>
          <span className="dp-feed-time">{t}</span>
          <span className="dp-feed-type">{type}</span>
          <span className="dp-feed-who">{who}</span>
          <span className={`dp-feed-res ${res === 'FAIL' ? 'is-fail' : res === 'OPEN' || res === 'LIVE' ? 'is-warn' : ''}`}>
            ● {res}
          </span>
        </span>
      ))}
    </div>
  )

  return (
    <div className="dp-root">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;700;900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@1,9..144,300..600&display=swap"
        rel="stylesheet"
      />

      <LandingFx />

      {/* Crosshair cursor (fine pointers only) */}
      <div id="dp-cursor" aria-hidden="true">
        <i className="dp-cursor-h" /><i className="dp-cursor-v" /><i className="dp-cursor-ring" />
      </div>

      {/* Fixed depth gauge */}
      <div className="dp-gauge" aria-hidden="true">
        <span className="dp-gauge-cap">0.0M</span>
        <div className="dp-gauge-track">
          <div className="dp-gauge-fill" id="dp-gauge-fill" />
          {Array.from({ length: 11 }).map((_, i) => (
            <i className="dp-gauge-tick" style={{ top: `${(i + 1) * (100 / 12)}%` }} key={i} />
          ))}
          <div className="dp-gauge-marker" id="dp-gauge-marker">
            <span id="dp-depth-readout">−0.0M</span>
          </div>
        </div>
        <span className="dp-gauge-cap">−12M</span>
      </div>

      {/* ── Nav ── */}
      <nav className="dp-nav">
        <a href="/" className="dp-nav-logo">
          <img src="/logo.jpeg" alt="" className="dp-nav-logo-img" />
          <span className="dp-nav-name">POOLCONTROL<span className="dp-accent">.AI</span></span>
        </a>
        <div className="dp-nav-links">
          <a href="#protocol-01" data-text="AUDITS">AUDITS</a>
          <a href="#protocol-02" data-text="COACH PC">COACH PC</a>
          <a href="#process" data-text="PROCESS">PROCESS</a>
          <a href="#pricing" data-text="PRICING">PRICING</a>
          <a href="#contact" data-text="CONTACT">CONTACT</a>
        </div>
        <div className="dp-nav-actions">
          <a href="/auth/login" className="dp-nav-signin">SIGN IN</a>
          <a href={MAIL_DEMO} className="dp-nav-demo">REQUEST DEMO<span aria-hidden="true">&nbsp;→</span></a>
        </div>
        <MobileNav mailDemo={MAIL_DEMO} />
      </nav>

      {/* ── Hero / surface ── */}
      <header className="dp-hero">
        <div className="dp-hero-grid" aria-hidden="true" />
        <div className="dp-sonar" aria-hidden="true"><i /><i /><i /></div>

        <div className="dp-hero-meta">
          <span>AQUATIC AUDIT INFRASTRUCTURE</span>
          <span className="dp-hero-meta-mid" aria-hidden="true">+ + + + +</span>
          <span>SURFACE LEVEL — 0.0M</span>
        </div>

        <h1 className="dp-h1">
          <span className="dp-h1-line"><Rise text="VIGILANCE," delay={0.15} /></span>
          <span className="dp-h1-line dp-h1-line-2">
            <Rise text="VERIFIED" delay={0.55} />
            <span className="dp-h1-period" aria-hidden="true">.</span>
          </span>
        </h1>

        <div className="dp-hero-low">
          <p className="dp-hero-sub">
            PoolControl.ai is the audit platform for aquatic facilities.
            Document <em>every</em> evaluation. Track <em>every</em> failure.
            Prove you run a safe facility — <em>before</em> you ever need to.
          </p>
          <div className="dp-hero-cta">
            <a href={MAIL_TRIAL} className="dp-btn dp-btn-solid">
              START FREE TRIAL <span aria-hidden="true">→</span>
            </a>
            <a href={TEL} className="dp-btn dp-btn-line">
              TALK TO US — (940) 600-3636
            </a>
            <p className="dp-hero-note">14-DAY TRIAL · NO CREDIT CARD · WHITE-GLOVE SETUP</p>
          </div>
        </div>

        <div className="dp-hero-base" aria-hidden="true">
          <span>SCROLL TO DESCEND</span>
          <i className="dp-scroll-arrow" />
          <span>EVIDENCE BELOW THE SURFACE</span>
        </div>
      </header>

      {/* ── Live audit feed ticker ── */}
      <div className="dp-feed" role="presentation">
        <div className="dp-feed-label">LIVE<br />FEED</div>
        <div className="dp-feed-belt">{feedRow('a')}{feedRow('b')}</div>
      </div>

      {/* ── Stats strip ── */}
      <section className="dp-stats">
        <div className="dp-stat dp-reveal">
          <Ticks />
          <div className="dp-stat-val"><span className="dp-count" data-target="5">0</span><small>MIN</small></div>
          <div className="dp-stat-label">AVERAGE TIME TO RUN A FULL AUDIT</div>
        </div>
        <div className="dp-stat dp-reveal dp-d1">
          <Ticks />
          <div className="dp-stat-val"><span className="dp-count" data-target="7">0</span></div>
          <div className="dp-stat-label">STANDARDIZED AUDIT TYPES BUILT IN</div>
        </div>
        <div className="dp-stat dp-reveal dp-d2">
          <Ticks />
          <div className="dp-stat-val"><span className="dp-count" data-target="100">0</span><small>%</small></div>
          <div className="dp-stat-label">TAMPER-PROOF, COURT-READY AUDIT LOG</div>
        </div>
        <div className="dp-stat dp-reveal dp-d3">
          <Ticks />
          <div className="dp-stat-val"><small>&lt;</small><span className="dp-count" data-target="24">0</span><small>HR</small></div>
          <div className="dp-stat-label">FROM SIGN-UP TO FIRST LIVE AUDIT</div>
        </div>
      </section>

      {/* ── Protocol 01 — Structured audits (above water) ── */}
      <section id="protocol-01" className="dp-sect dp-sect-light">
        <SectionTag depth="−01.5M" code="PROTOCOL 01" title="STRUCTURED AUDITS" />
        <div className="dp-split">
          <div className="dp-split-copy">
            <h2 className="dp-h2 dp-reveal">
              EVERY EVALUATION<br />DOCUMENTED. <em>Every time.</em>
            </h2>
            <p className="dp-body dp-reveal dp-d1">
              Seven standardized audit types — zone scanning, VAT, CPR, dispatch, EAVS,
              guest service, and cleaning. Every evaluation is timestamped and permanently stored.
            </p>
            <ul className="dp-list dp-reveal dp-d2">
              <li><Check />Run full audits in under 5 minutes from any device</li>
              <li><Check />Criteria-based scoring with instant pass/fail results</li>
              <li><Check />Automatic Slack &amp; Teams alerts on failed audits</li>
              <li><Check />Immutable audit trail — tamper-proof and court-ready</li>
            </ul>
          </div>
          <div className="dp-reveal dp-d2">
            <div className="dp-term">
              <Ticks />
              <div className="dp-term-bar">
                <span>AUDIT://ZONE-SCAN/LIVE</span>
                <span className="dp-term-rec">● REC</span>
              </div>
              <div className="dp-term-body">
                <i className="dp-scanline" aria-hidden="true" />
                <div className="dp-term-head">
                  <div>
                    <h4>ZONE SCANNING AUDIT</h4>
                    <p>J. MARTINEZ / POOL A / TODAY 14:14</p>
                  </div>
                  <span className="dp-pill dp-pill-live">IN PROGRESS</span>
                </div>
                {([
                  ['CLEAR WATER VISIBILITY THROUGHOUT ZONE', 'PASS'],
                  ['10/20 SCANNING PATTERN MAINTAINED', 'PASS'],
                  ['RESPONSE READINESS CHECK', 'FAIL'],
                  ['RESCUE EQUIPMENT PRESENT & ACCESSIBLE', 'PASS'],
                  ['ZONE OVERLAP WITH ADJACENT GUARD', 'N/A'],
                ] as const).map(([label, res]) => (
                  <div className="dp-term-row" key={label}>
                    <span className="dp-term-row-label">{label}</span>
                    <span className={`dp-pill ${res === 'PASS' ? 'dp-pill-pass' : res === 'FAIL' ? 'dp-pill-fail' : 'dp-pill-na'}`}>{res}</span>
                  </div>
                ))}
                <div className="dp-term-foot">
                  <span>SCORE: <strong>78%</strong></span>
                  <span className="dp-term-coach">✦ ASK COACH PC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="dp-trust dp-reveal dp-d3">
          <span className="dp-trust-label">DEPLOYED ACROSS /</span>
          {['WATER PARKS', 'MUNICIPAL POOLS', 'RESORTS', 'REC CENTERS', 'AQUATIC CENTERS'].map((t) => (
            <span key={t} className="dp-trust-item">{t}</span>
          ))}
        </div>
      </section>

      {/* ── Waterline ── */}
      <div className="dp-waterline" aria-hidden="true">
        <svg viewBox="0 0 2880 90" preserveAspectRatio="none" className="dp-waterline-svg">
          <path
            className="dp-waterline-path"
            d="M0,46 L120,46 L150,18 L180,74 L210,46 L480,46 L510,30 L540,62 L570,46 L960,46 L990,10 L1020,82 L1050,46 L1440,46 L1470,28 L1500,64 L1530,46 L1920,46 L1950,16 L1980,76 L2010,46 L2400,46 L2430,32 L2460,60 L2490,46 L2880,46"
            fill="none"
          />
        </svg>
        <div className="dp-waterline-tag">
          <span>WATERLINE</span><span>— BREAKING THE SURFACE —</span><span>0.0M ↓</span>
        </div>
      </div>

      {/* ── Protocol 02 — Coach PC (submerged) ── */}
      <section id="protocol-02" className="dp-sect dp-sect-deep dp-depth-4">
        <div className="dp-caustics" aria-hidden="true" />
        <SectionTag depth="−04.0M" code="PROTOCOL 02" title="COACH PC — AI COACHING" />
        <div className="dp-split dp-split-flip">
          <div className="dp-split-copy">
            <h2 className="dp-h2 dp-reveal">
              REAL-TIME GUIDANCE.<br /><em>Every evaluation.</em>
            </h2>
            <p className="dp-body dp-reveal dp-d1">
              Coach PC pulls each guard&apos;s full failure history and surfaces the most
              relevant coaching points the moment a supervisor needs them — no manual prep required.
            </p>
            <ul className="dp-list dp-reveal dp-d2">
              <li><Check />Context-aware: references each guard&apos;s recent audit history</li>
              <li><Check />Streams live responses during the audit — no waiting</li>
              <li><Check />Generates post-audit coaching points automatically</li>
              <li><Check />Produces targeted team training plans from performance data</li>
            </ul>
          </div>
          <div className="dp-reveal dp-d2">
            <div className="dp-term dp-term-deep">
              <Ticks />
              <div className="dp-term-bar">
                <span>COACH://PC/STREAM</span>
                <span className="dp-term-rec dp-term-rec-aqua">● STREAMING</span>
              </div>
              <div className="dp-term-body">
                <i className="dp-scanline" aria-hidden="true" />
                <div className="dp-coach-id">
                  <span className="dp-coach-glyph" aria-hidden="true">✦</span>
                  <div>
                    <div className="dp-coach-name">COACH PC</div>
                    <div className="dp-coach-sub">AI COACHING ASSISTANT — CONTEXT LOADED</div>
                  </div>
                </div>
                <div className="dp-msg">
                  Jordan failed the response readiness check today. Looking at their history
                  over the last 45 days, this is their third failure on response time — all
                  within the 2–4 PM window when pool traffic peaks.
                </div>
                <div className="dp-msg">
                  I&apos;d recommend a focused drill on mental readiness and activation speed
                  before their next shift. The pattern suggests attention drift, not skill
                  gaps.<i className="dp-caret" aria-hidden="true" />
                </div>
                <div className="dp-msg-meta">
                  GUARD CONTEXT / 8 AUDITS IN 45 DAYS / 3 RESPONSE-TIME FAILURES / LAST REMEDIATION 12D AGO
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Protocol 03 — Analytics ── */}
      <section className="dp-sect dp-sect-deep dp-depth-6">
        <div className="dp-caustics" aria-hidden="true" />
        <SectionTag depth="−06.0M" code="PROTOCOL 03" title="ANALYTICS & REMEDIATION" />
        <div className="dp-split">
          <div className="dp-split-copy">
            <h2 className="dp-h2 dp-reveal">
              KNOW WHO NEEDS ATTENTION<br /><em>before an incident happens.</em>
            </h2>
            <p className="dp-body dp-reveal dp-d1">
              Team-wide pass rates, failure patterns, LPR scores, and 30-day trends — all in
              one place. Failed audits automatically create remediation tasks with deadlines
              and accountability.
            </p>
            <ul className="dp-list dp-reveal dp-d2">
              <li><Check />Facility-wide performance dashboard with trend lines</li>
              <li><Check />Failed audits auto-generate remediation tasks</li>
              <li><Check />Countdown timers and status tracking on every task</li>
              <li><Check />Certification expiry alerts at 30, 14, 7, and 1 day out</li>
            </ul>
          </div>
          <div className="dp-reveal dp-d2">
            <div className="dp-term dp-term-deep">
              <Ticks />
              <div className="dp-term-bar">
                <span>OPS://FACILITY/OVERVIEW</span>
                <span className="dp-term-rec dp-term-rec-aqua">● SYNCED</span>
              </div>
              <div className="dp-term-body">
                <i className="dp-scanline" aria-hidden="true" />
                <div className="dp-agrid">
                  <div className="dp-acell">
                    <div className="dp-acell-val">87%</div>
                    <div className="dp-acell-label">TEAM PASS RATE</div>
                    <div className="dp-acell-delta is-up">▲ +4% THIS WEEK</div>
                  </div>
                  <div className="dp-acell">
                    <div className="dp-acell-val">34</div>
                    <div className="dp-acell-label">AUDITS THIS MONTH</div>
                    <div className="dp-acell-delta is-up">▲ +8 VS LAST</div>
                  </div>
                  <div className="dp-acell">
                    <div className="dp-acell-val">3</div>
                    <div className="dp-acell-label">OPEN REMEDIATIONS</div>
                    <div className="dp-acell-delta is-down">▼ 2 OVERDUE</div>
                  </div>
                </div>
                <div className="dp-chart">
                  <div className="dp-chart-label">PASS RATE / LAST 8 WEEKS</div>
                  <div className="dp-chart-bars">
                    {[55, 62, 58, 70, 74, 68, 82, 87].map((h, i) => (
                      <div
                        key={i}
                        className={`dp-bar${i === 7 ? ' dp-bar-now' : ''}`}
                        style={{ height: `${h}%`, transitionDelay: `${i * 70}ms` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="dp-rem">
                  <div className="dp-rem-row">
                    <span>J. MARTINEZ — RESPONSE READINESS / ZONE SCAN</span>
                    <span className="dp-pill dp-pill-fail">2D OVERDUE</span>
                  </div>
                  <div className="dp-rem-row">
                    <span>C. THOMPSON — CPR COMPRESSION DEPTH</span>
                    <span className="dp-pill dp-pill-live">DUE TODAY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── By the numbers ── */}
      <section className="dp-numbers dp-depth-7">
        <SectionTag depth="−07.5M" code="INDEX" title="BY THE NUMBERS" />
        <div className="dp-numbers-grid">
          <div className="dp-num dp-reveal">
            <div className="dp-num-val">5<small>MIN</small></div>
            <p>Average time to complete a full audit, end to end.</p>
          </div>
          <div className="dp-num dp-reveal dp-d1">
            <div className="dp-num-val">100<small>%</small></div>
            <p>Audit records permanently stored. Never editable. Ever.</p>
          </div>
          <div className="dp-num dp-reveal dp-d2">
            <div className="dp-num-val">7</div>
            <p>Audit types covering every critical safety area.</p>
          </div>
          <div className="dp-num dp-reveal dp-d3">
            <div className="dp-num-val"><small>&lt;</small>24<small>HR</small></div>
            <p>From signing up to running your first live audit.</p>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="dp-sect dp-sect-deep dp-depth-8">
        <SectionTag depth="−08.5M" code="SEQUENCE" title="UP AND RUNNING IN ONE DAY" />
        <div className="dp-steps">
          {([
            ['01', 'WE SET YOU UP', 'We import your roster, configure your audit cadence, and walk your managers through the platform. No IT involvement needed.'],
            ['02', 'SUPERVISORS AUDIT', 'Open the schedule, select a guard, run the evaluation. Coach PC guides in real time. A complete audit takes under 5 minutes.'],
            ['03', 'YOU STAY PROTECTED', 'Every audit logged, every failure tracked, every remediation documented. Your liability exposure drops from day one.'],
          ] as const).map(([n, h, p], i) => (
            <div className={`dp-step dp-reveal dp-d${i + 1}`} key={n}>
              <Ticks />
              <div className="dp-step-num">{n}</div>
              <h3>{h}</h3>
              <p>{p}</p>
              <i className="dp-step-arrow" aria-hidden="true">→</i>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="dp-sect dp-sect-deep dp-depth-9">
        <SectionTag depth="−09.5M" code="TERMS" title="SIMPLE. NO SURPRISES." />
        <div className="dp-price dp-reveal dp-d1">
          <Ticks />
          <div className="dp-price-head">
            <div>
              <div className="dp-price-plan">PROFESSIONAL / ANNUAL FACILITY CONTRACT</div>
              <h3 className="dp-price-title">Contact us for <em>facility pricing.</em></h3>
              <p className="dp-price-sub">WIRE OR ACH · WHITE-GLOVE ONBOARDING INCLUDED</p>
            </div>
            <div className="dp-price-trial">14-DAY FREE TRIAL<br />NO CREDIT CARD</div>
          </div>
          <div className="dp-price-grid">
            {[
              'UNLIMITED LIFEGUARDS',
              'ALL 7 AUDIT TYPES',
              'COACH PC — AI GUIDANCE',
              'REMEDIATION TRACKING',
              'TEAM ANALYTICS DASHBOARD',
              'CERT EXPIRY ALERTS',
              'SLACK & TEAMS WEBHOOKS',
              'WHITE-GLOVE ONBOARDING',
            ].map((f) => (
              <div className="dp-price-feat" key={f}><Check />{f}</div>
            ))}
          </div>
          <a href={MAIL_TRIAL} className="dp-btn dp-btn-aqua dp-price-cta">
            START YOUR 14-DAY FREE TRIAL <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      {/* ── CTA band ── */}
      <div className="dp-cta">
        <div className="dp-cta-marquee" aria-hidden="true">
          <div className="dp-cta-track">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i}>PROTECT THE WATER&nbsp;<em>—</em>&nbsp;</span>
            ))}
          </div>
        </div>
        <div className="dp-cta-inner">
          <p className="dp-cta-sub dp-reveal">
            Join facilities that replaced clipboards with a system that holds up under scrutiny.
          </p>
          <div className="dp-cta-btns dp-reveal dp-d1">
            <a href={MAIL_TRIAL} className="dp-btn dp-btn-ink">START FREE TRIAL <span aria-hidden="true">→</span></a>
            <a href={TEL} className="dp-btn dp-btn-ink-line">CALL (940) 600-3636</a>
          </div>
        </div>
      </div>

      {/* ── Contact ── */}
      <section id="contact" className="dp-sect dp-sect-deep dp-depth-11">
        <SectionTag depth="−11.0M" code="CHANNELS" title="THREE WAYS TO BEGIN" />
        <p className="dp-body dp-contact-lede dp-reveal">
          We personally onboard every new facility. Reach us however works best for you.
        </p>
        <div className="dp-contact-grid">
          <a href={MAIL_TRIAL} className="dp-card dp-reveal dp-d1">
            <Ticks />
            <span className="dp-card-no">A/</span>
            <h3>START FREE TRIAL</h3>
            <p>Email us and we&apos;ll have your facility set up within 24 hours.</p>
            <span className="dp-card-link">poolcontrolnate@gmail.com <span aria-hidden="true">→</span></span>
          </a>
          <a href={TEL} className="dp-card dp-reveal dp-d2">
            <Ticks />
            <span className="dp-card-no">B/</span>
            <h3>BOOK A CALL</h3>
            <p>Speak directly with our team. We&apos;ll walk you through the platform live.</p>
            <span className="dp-card-link">(940) 600-3636 <span aria-hidden="true">→</span></span>
          </a>
          <a href={MAIL_DEMO} className="dp-card dp-reveal dp-d3">
            <Ticks />
            <span className="dp-card-no">C/</span>
            <h3>REQUEST A DEMO</h3>
            <p>See PoolControl.ai in action with a live walkthrough of your use case.</p>
            <span className="dp-card-link">Schedule a demo <span aria-hidden="true">→</span></span>
          </a>
        </div>

        <div className="dp-team-divider dp-reveal">
          <span className="dp-team-divider-label">THE TEAM</span>
        </div>
        <div className="dp-team-grid">
          <div className="dp-team-card dp-reveal dp-d1">
            <Ticks />
            <img src="/team-nathan.jpg" alt="Nathan Rusch" className="dp-team-photo" />
            <h3>Nathan Rusch</h3>
            <p className="dp-team-role">Founder / CEO</p>
            <a href="mailto:poolcontrolnate@gmail.com" className="dp-card-link">
              poolcontrolnate@gmail.com <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="dp-team-card dp-reveal dp-d2">
            <Ticks />
            <img src="/team-sachin.jpg" alt="Sachin Selvakumar" className="dp-team-photo" />
            <h3>Sachin Selvakumar</h3>
            <p className="dp-team-role">Co-Founder / CTO</p>
            <a href="mailto:sachin.selvakumar24@gmail.com" className="dp-card-link">
              sachin.selvakumar24@gmail.com <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer / floor ── */}
      <footer className="dp-footer">
        <div className="dp-footer-floor" aria-hidden="true">
          <span>— POOL FLOOR / −12.0M —</span>
        </div>
        <div className="dp-footer-inner">
          <div className="dp-footer-brand">
            <img src="/logo.jpeg" alt="" className="dp-footer-logo" />
            <span>POOLCONTROL<span className="dp-accent">.AI</span></span>
          </div>
          <span className="dp-footer-copy">© {year} POOLCONTROL.AI / AQUATICS PERFORMANCE PLATFORM</span>
          <div className="dp-footer-links">
            <a href="/legal/terms">TERMS</a>
            <a href="/legal/privacy">PRIVACY</a>
            <a href="/legal/ai">AI &amp; DATA</a>
            <a href="mailto:poolcontrolnate@gmail.com">CONTACT</a>
            <a href="/auth/login">SIGN IN</a>
            <a href="#">RESURFACE ↑</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
