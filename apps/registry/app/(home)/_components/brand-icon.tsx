'use client'

import { useState } from 'react'

// Theme-aware Simple Icons brand glyph. Near-black brands get a light fill in
// dark; brands invisible in light get a dark fill. Falls back to a monogram.
const TINT: Record<string, { light?: string; dark?: string }> = {
  github: { dark: 'ffffff' },
  openai: { dark: 'ffffff' },
  x: { dark: 'ffffff' },
  vercel: { dark: 'ffffff' },
  notion: { dark: 'ffffff' },
  anthropic: { dark: 'ffffff' },
  elevenlabs: { dark: 'ffffff' },
  caldotcom: { dark: 'ffffff' },
  openrouter: { dark: 'ffffff' },
  sentry: { dark: 'ffffff' },
}

export function BrandIcon({ slug, label, size = 18 }: { slug: string; label: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    const m = label.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '•'
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center font-mono font-bold text-ak-graphite"
        style={{ width: size, height: size, fontSize: size * 0.7 }}
      >
        {m}
      </span>
    )
  }
  const url = (c?: string) => `https://cdn.simpleicons.org/${slug}${c ? `/${c}` : ''}`
  const t = TINT[slug]
  const common = {
    alt: '',
    width: size,
    height: size,
    loading: 'lazy' as const,
    onError: () => setFailed(true),
    style: { width: size, height: size },
  }
  if (!t) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url()} {...common} className="object-contain" />
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url(t.light)} {...common} className="object-contain dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url(t.dark)} {...common} className="hidden object-contain dark:block" />
    </>
  )
}
