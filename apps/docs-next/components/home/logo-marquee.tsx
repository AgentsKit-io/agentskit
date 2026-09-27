'use client'

import { useState } from 'react'
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
  const [paused, setPaused] = useState(false)
  const track = [...items, ...items]
  return (
    <div data-logo-marquee="" className="relative">
      <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} className="relative z-10 mb-2 min-h-11 rounded-md border border-ak-border px-4 text-sm text-ak-foam">{paused ? 'Play logos' : 'Pause logos'}</button>
      <div data-logo-marquee-window className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        data-logo-marquee-track=""
        className="flex w-max gap-2 pr-2"
        style={{ animation: `ak-logo-scroll ${duration}s linear infinite`, animationDirection: reverse ? 'reverse' : 'normal', animationPlayState: paused ? 'paused' : 'running' }}
      >
        {track.map((it, i) => (
          <Logo key={`${it.id}-${i}`} item={it} duplicate={i >= items.length} />
        ))}
      </div>
      </div>
    </div>
  )
}
