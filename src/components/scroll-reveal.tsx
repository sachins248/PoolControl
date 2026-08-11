'use client'

import { useEffect } from 'react'

export default function ScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px 80px 0px' }
    )
    document.querySelectorAll('.reveal, .lp-reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
