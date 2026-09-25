'use client'

import { useEffect, useRef } from 'react'

export function LiquidCursorGradient() {
  const gradientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const gradient = gradientRef.current
    if (!gradient) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return
      gradient.style.setProperty('--cursor-x', `${event.clientX}px`)
      gradient.style.setProperty('--cursor-y', `${event.clientY}px`)
      gradient.dataset.active = 'true'
    }
    const leave = () => { gradient.dataset.active = 'false' }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [])

  return <div ref={gradientRef} className="ak-liquid-cursor-gradient" data-liquid-cursor-gradient="" aria-hidden="true">
    <span className="ak-liquid-cursor-gradient__orb ak-liquid-cursor-gradient__orb--blue" />
    <span className="ak-liquid-cursor-gradient__orb ak-liquid-cursor-gradient__orb--green" />
  </div>
}
