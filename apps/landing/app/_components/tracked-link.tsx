'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { withInternalReference } from '@/lib/analytics-contract'
import { track } from '@/lib/posthog-client'

type BaseProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }

/**
 * Cross-property ecosystem link: tags the URL with UTM params and fires
 * `ecosystem_clicked` on click and preserves acquisition UTMs on the destination.
 */
export function EcoLink({
  href,
  target,
  placement,
  children,
  ...rest
}: BaseProps & { href: string; target: string; placement: string }) {
  return (
    <a
      href={withInternalReference(href, placement, target)}
      onClick={() => {
        track('cta_clicked', {
          cta_id: `ecosystem_${target}`,
          destination: target,
          placement,
          surface: 'landing',
        })
        track('ecosystem_clicked', { target, placement })
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

/**
 * Community link (GitHub / Discord / npm): no UTM (off-ecosystem), fires
 * `community_clicked` on click.
 */
export function CommunityLink({
  href,
  target,
  children,
  ...rest
}: BaseProps & { href: string; target: string }) {
  return (
    <a
      href={href}
      onClick={() => {
        track('cta_clicked', {
          cta_id: `community_${target}`,
          destination: target,
          placement: 'community-link',
          surface: 'landing',
        })
        track('community_clicked', { target })
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

export function CtaLink({
  href,
  ctaId,
  destination,
  placement,
  children,
  ...rest
}: BaseProps & { href: string; ctaId: string; destination: string; placement: string }) {
  return (
    <a
      href={href}
      onClick={() =>
        track('cta_clicked', {
          cta_id: ctaId,
          destination,
          placement,
          surface: 'landing',
        })
      }
      {...rest}
    >
      {children}
    </a>
  )
}
