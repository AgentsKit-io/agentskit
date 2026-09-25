'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BrandIcon } from '@/components/home/brand-icon'

const FRAMEWORKS = [
  { slug: 'react', label: 'React' },
  { slug: 'vuedotjs', label: 'Vue' },
  { slug: 'svelte', label: 'Svelte' },
  { slug: 'solid', label: 'Solid' },
  { slug: 'angular', label: 'Angular' },
  { slug: 'nodedotjs', label: 'Node' },
  { slug: 'deno', label: 'Deno' },
  { slug: 'bun', label: 'Bun' },
] as const

const HEADLINE = 'Ship AI agents in JavaScript. Without gluing 8 libraries together.'
const HEADLINE_LINE_ONE = 'Ship AI agents in JavaScript.'
const HEADLINE_LINE_TWO = 'Without gluing 8 libraries together.'
export function HeroHeadline() {
  return (
    <h1
      data-static-home-headline=""
      aria-label={HEADLINE}
      className="font-display mb-5 max-w-2xl text-[2rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:mb-6 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
    >
      <span className="block" aria-hidden="true">
        {HEADLINE_LINE_ONE}
      </span>
      <span className="block text-ak-graphite" aria-hidden="true">
        {HEADLINE_LINE_TWO}
      </span>
    </h1>
  )
}

export function KineticFrameworkReel() {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const active = FRAMEWORKS[activeIndex]

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % FRAMEWORKS.length)
    }, 2100)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  return (
    <div
      data-kinetic-reel=""
      data-current={active.slug}
      role="img"
      aria-label={`Works with ${FRAMEWORKS.map(({ label }) => label).join(', ')}`}
      className="mt-8 flex min-h-7 items-center gap-4 sm:gap-5"
    >
      <span aria-hidden="true" className="shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-ak-graphite">
        Works with
      </span>
      <span aria-hidden="true" className="relative h-7 w-32 overflow-hidden" style={{ perspective: 360 }}>
        <AnimatePresence initial={false} mode="sync">
          <motion.span
            key={active.slug}
            data-reel-item=""
            initial={false}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12, rotateX: -80 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center gap-2 text-sm font-medium text-ak-foam"
            style={{ transformOrigin: 'center center', backfaceVisibility: 'hidden' }}
          >
            <BrandIcon slug={active.slug} label={active.label} size={20} imgClass="h-5 w-5" />
            <span>{active.label}</span>
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  )
}
