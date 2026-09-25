'use client'

import { motion } from 'motion/react'
import { brandSlug } from '@/lib/brand-slugs'
import { BrandIcon } from './brand-icon'

export interface MarqueeItem {
  id: string
  label: string
}

function Logo({ item, duplicate = false }: { item: MarqueeItem; duplicate?: boolean }) {
  return (
    <span
      data-logo-marquee-duplicate={duplicate ? '' : undefined}
      aria-hidden={duplicate || undefined}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3.5 py-2"
    >
      <BrandIcon slug={brandSlug(item.id)} label={item.label} size={18} imgClass="h-[18px] w-[18px]" />
      <span className="whitespace-nowrap font-mono text-sm text-ak-graphite">{item.label}</span>
    </span>
  )
}

/**
 * Infinite horizontal logo marquee, data-driven. Duplicates the track so the
 * loop is seamless; CSS turns it into static wrapped rows for reduced motion.
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
  const track = [...items, ...items]
  return (
    <div data-logo-marquee="" className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <motion.div
        data-logo-marquee-track=""
        className="flex w-max gap-2"
        initial={false}
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {track.map((it, i) => (
          <Logo key={`${it.id}-${i}`} item={it} duplicate={i >= items.length} />
        ))}
      </motion.div>
    </div>
  )
}
