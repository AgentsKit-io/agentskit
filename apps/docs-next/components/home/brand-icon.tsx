'use client'

import { useState } from 'react'

/**
 * Theme-aware brand icon from Simple Icons. Brands whose default glyph is
 * near-black (invisible in dark) or near-white (invisible in light) get a
 * per-theme color override and render two <img> swapped via the `dark:` variant.
 * Everything else renders a single brand-coloured icon (fine on both themes).
 * Falls back to a monogram when the slug has no Simple Icons entry.
 */
const TINT: Record<string, { light?: string; dark?: string }> = {
  // near-black default → light fill in dark theme
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
  framer: { dark: 'ffffff' },
  // need both: invisible at one end of the spectrum on each theme
  deno: { light: '000000', dark: 'ffffff' },
  bun: { light: '1f2430', dark: 'fbf0df' },
  // colored brand whose default is near-black: pin the brand red on both themes
  angular: { light: 'dd0031', dark: 'dd0031' },
}

export function BrandIcon({
  slug,
  label,
  size = 20,
  imgClass = '',
}: {
  slug: string | null
  label: string
  size?: number
  imgClass?: string
}) {
  const [failed, setFailed] = useState(false)
  const monogram = label.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '•'

  if (failed || !slug) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center font-mono font-bold text-ak-graphite"
        style={{ width: size, height: size, fontSize: size * 0.7 }}
      >
        {monogram}
      </span>
    )
  }

  const url = (c?: string) => `https://cdn.simpleicons.org/${slug}${c ? `/${c}` : ''}`
  const common = {
    alt: '',
    width: size,
    height: size,
    loading: 'lazy' as const,
    onError: () => setFailed(true),
    style: { width: size, height: size },
  }
  const tint = TINT[slug]

  if (!tint) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url()} {...common} className={`object-contain ${imgClass}`} />
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url(tint.light)} {...common} className={`object-contain dark:hidden ${imgClass}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url(tint.dark)} {...common} className={`hidden object-contain dark:block ${imgClass}`} />
    </>
  )
}
