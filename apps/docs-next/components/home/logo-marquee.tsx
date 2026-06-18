'use client'

import { motion, useReducedMotion } from 'motion/react'
import { brandSlug } from '@/lib/brand-slugs'
import { BrandIcon } from './brand-icon'

export interface MarqueeItem {
  id: string
  label: string
}

function Logo({ item }: { item: MarqueeItem }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3.5 py-2">
      <BrandIcon slug={brandSlug(item.id)} label={item.label} size={18} imgClass="h-[18px] w-[18px]" />
      <span className="whitespace-nowrap font-mono text-sm text-ak-graphite">{item.label}</span>
    </span>
  )
}

/**
 * Infinite horizontal logo marquee, data-driven. Duplicates the track so the
 * loop is seamless; pauses for reduced-motion (static wrapped rows).
 */
export function LogoMarquee({
  items,
  duration = 40,
  reverse = false,
}: {
  items: MarqueeItem[]
  duration?: number
  reverse?: boolean
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Logo key={it.id} item={it} />
        ))}
      </div>
    )
  }

  const track = [...items, ...items]
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <motion.div
        className="flex w-max gap-2"
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {track.map((it, i) => (
          <Logo key={`${it.id}-${i}`} item={it} />
        ))}
      </motion.div>
    </div>
  )
}
