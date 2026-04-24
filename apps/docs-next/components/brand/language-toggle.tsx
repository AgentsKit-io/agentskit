'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function LanguageToggle() {
  const path = usePathname() ?? '/'
  const isPt = path === '/pt' || path.startsWith('/pt/')
  const label = isPt ? 'EN' : 'PT'
  const href = isPt ? '/' : '/pt'
  return (
    <Link
      href={href}
      aria-label={isPt ? 'Switch to English' : 'Trocar para português'}
      title={isPt ? 'Switch to English' : 'Trocar para português'}
      className="inline-flex size-7 items-center justify-center rounded border border-ak-border bg-ak-surface font-mono text-[10px] font-semibold uppercase tracking-widest text-ak-graphite transition hover:border-ak-foam hover:text-ak-foam"
    >
      {label}
    </Link>
  )
}
