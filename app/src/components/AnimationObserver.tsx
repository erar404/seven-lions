'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AnimationObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll<HTMLElement>(
        '[data-reveal]:not(.is-visible), [data-reveal-x]:not(.is-visible)'
      )
      if (elements.length === 0) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0, rootMargin: '0px 0px -32px 0px' }
      )

      elements.forEach((el) => observer.observe(el))
      return () => observer.disconnect()
    }, 60)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
