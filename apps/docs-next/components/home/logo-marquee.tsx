'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { brandSlug } from '@/lib/brand-slugs'

export interface MarqueeItem {
  id: string
  label: string
}

function Logo({ item }: { item: MarqueeItem }) {
  const [failed, setFailed] = useState(false)
  const slug = brandSlug(item.id)
  const monogram = item.label.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '•'
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 pr-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ak-foam/90">
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://cdn.simpleicons.org/${slug}`}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-5 w-5"
          />
        ) : (
          <span aria-hidden="true" className="font-mono text-xs font-bold text-ak-midnight">
            {monogram}
          </span>
        )}
      </span>
      <span className="font-mono text-sm text-ak-graphite">{item.label}</span>
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
