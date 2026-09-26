'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { track } from '@/lib/analytics-client'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import type { AskDocsWidgetProps } from './ask-panel'

export type { AskDocsWidgetProps, AskWidgetBrand, AskWidgetCta } from './ask-panel'

const loadPanel = () => import('./ask-panel')

// The chat runtime, markdown renderer, and deterministic knowledge (~130 KB gzip) load only when
// a visitor opens the panel; the floating button is all the initial page needs.
const AskDocsPanel = dynamic(() => loadPanel().then((module) => module.AskDocsPanel), {
  ssr: false,
  loading: () => (
    <div
      data-ak-ask-panel=""
      aria-busy="true"
      className="fixed bottom-4 right-4 z-50 flex h-[min(620px,82vh)] w-[min(440px,94vw)] items-center justify-center rounded-xl border border-ak-border/80 bg-ak-midnight/78 font-mono text-xs text-ak-graphite shadow-2xl backdrop-blur-2xl"
    >
      Loading…
    </div>
  ),
})

export function AskDocsWidget({ defaultOpen = false, fabLabel, ...props }: AskDocsWidgetProps = {}) {
  const [open, setOpen] = useState(defaultOpen)
  const effectiveFabLabel = fabLabel ?? props.brand?.fabLabel ?? 'Ask the docs'
  const effectiveLogo = props.logo ?? props.brand?.logo
  const askLabel = typeof effectiveFabLabel === 'string' ? effectiveFabLabel : 'Ask the docs'

  if (open) return <AskDocsPanel {...props} onClose={() => setOpen(false)} />

  return (
    <button
      type="button"
      onClick={() => {
        track('cta_clicked', { cta_id: 'ask_docs_open', destination: 'ask_docs', placement: 'floating-button', surface: 'docs' })
        setOpen(true)
      }}
      onPointerEnter={() => { void loadPanel() }}
      onFocus={() => { void loadPanel() }}
      aria-label={askLabel}
      data-ak-ask-fab=""
      className="group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ak-border/80 bg-ak-midnight/70 px-4 py-2.5 font-mono text-xs font-semibold text-ak-foam shadow-lg backdrop-blur-xl"
    >
      <span aria-hidden>{effectiveLogo ?? <AnimatedLogo variant="nav" size={16} />}</span>{effectiveFabLabel}
    </button>
  )
}
