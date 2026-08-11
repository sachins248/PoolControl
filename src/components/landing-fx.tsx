'use client'

import { useEffect } from 'react'

/**
 * All scroll/pointer-driven behavior for the landing page:
 * - .dp-reveal intersection reveals
 * - .dp-count number roll-ups
 * - the fixed depth gauge (scroll progress -> meters)
 * - the crosshair cursor (fine pointers only)
 */
export default function LandingFx() {
  useEffect(() => {
    const cleanups: Array<() => void> = []

    /* ── Reveals ── */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px 60px 0px' }
    )
    document.querySelectorAll('.dp-reveal').forEach((el) => io.observe(el))
    cleanups.push(() => io.disconnect())

    /* ── Counters ── */
    const animateCount = (el: HTMLElement) => {
      const target = parseFloat(el.dataset.target || '0')
      const prefix = el.dataset.prefix || ''
      const suffix = el.dataset.suffix || ''
      const decimals = el.dataset.target?.includes('.') ? 1 : 0
      const dur = 1400
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur)
        const eased = 1 - Math.pow(1 - p, 4)
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target as HTMLElement)
            cio.unobserve(e.target)
          }
        })
      },
      { threshold: 0.4 }
    )
    document.querySelectorAll<HTMLElement>('.dp-count').forEach((el) => cio.observe(el))
    cleanups.push(() => cio.disconnect())

    /* ── Depth gauge ── */
    const fill = document.getElementById('dp-gauge-fill')
    const marker = document.getElementById('dp-gauge-marker')
    const readout = document.getElementById('dp-depth-readout')
    const MAX_DEPTH = 12
    let scrollRaf = 0
    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        const doc = document.documentElement
        const max = doc.scrollHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
        if (fill) fill.style.height = `${p * 100}%`
        if (marker) marker.style.top = `${p * 100}%`
        if (readout) readout.textContent = `−${(p * MAX_DEPTH).toFixed(1)}M`
        document.body.classList.toggle('dp-submerged', p > 0.28)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
    })

    /* ── Crosshair cursor ── */
    if (window.matchMedia('(pointer: fine)').matches) {
      const cursor = document.getElementById('dp-cursor')
      if (cursor) {
        let tx = -100
        let ty = -100
        let cx = -100
        let cy = -100
        let live = true
        const onMove = (e: MouseEvent) => {
          tx = e.clientX
          ty = e.clientY
          cursor.classList.add('on')
        }
        const onLeave = () => cursor.classList.remove('on')
        const onOver = (e: MouseEvent) => {
          const t = e.target as HTMLElement
          cursor.classList.toggle('lock', !!t.closest('a, button, .dp-hot'))
        }
        const loop = () => {
          if (!live) return
          cx += (tx - cx) * 0.22
          cy += (ty - cy) * 0.22
          cursor.style.transform = `translate(${cx}px, ${cy}px)`
          requestAnimationFrame(loop)
        }
        window.addEventListener('mousemove', onMove, { passive: true })
        document.documentElement.addEventListener('mouseleave', onLeave)
        window.addEventListener('mouseover', onOver, { passive: true })
        requestAnimationFrame(loop)
        cleanups.push(() => {
          live = false
          window.removeEventListener('mousemove', onMove)
          document.documentElement.removeEventListener('mouseleave', onLeave)
          window.removeEventListener('mouseover', onOver)
        })
      }
    }

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}
