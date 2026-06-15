'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { track } from '@/lib/posthog-client'

const SOURCE = 'registry'

/** Append ecosystem UTM params to a cross-property URL. */
export function withUtm(url: string, medium: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', SOURCE)
    u.searchParams.set('utm_medium', medium)
    u.searchParams.set('utm_campaign', 'ecosystem')
    return u.toString()
  } catch {
    return url
  }
}

type BaseProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }

/** Cross-property ecosystem link: tags UTM + fires `ecosystem_clicked`. */
export function EcoLink({
  href,
  target,
  placement,
  children,
  ...rest
}: BaseProps & { href: string; target: string; placement: string }) {
  return (
    <a
      href={withUtm(href, placement)}
      onClick={() => track('ecosystem_clicked', { target, placement })}
      {...rest}
    >
      {children}
    </a>
  )
}

/** Community link (GitHub / Discord / npm): fires `community_clicked`. */
export function CommunityLink({
  href,
  target,
  children,
  ...rest
}: BaseProps & { href: string; target: string }) {
  return (
    <a href={href} onClick={() => track('community_clicked', { target })} {...rest}>
      {children}
    </a>
  )
}
