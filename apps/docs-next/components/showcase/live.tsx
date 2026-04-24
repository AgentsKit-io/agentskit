'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { ComponentType } from 'react'
import type { ShowcaseMeta } from '@/lib/showcase'

const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  BasicChat: () => import('@/components/examples/BasicChat').then((m) => ({ default: m.BasicChat })),
  ToolUseChat: () => import('@/components/examples/ToolUseChat').then((m) => ({ default: m.ToolUseChat })),
  RAGChat: () => import('@/components/examples/RAGChat').then((m) => ({ default: m.RAGChat })),
  CodeAssistant: () => import('@/components/examples/CodeAssistant').then((m) => ({ default: m.CodeAssistant })),
  MarkdownChat: () => import('@/components/examples/MarkdownChat').then((m) => ({ default: m.MarkdownChat })),
  SupportBot: () => import('@/components/examples/SupportBot').then((m) => ({ default: m.SupportBot })),
  MultiAgentChat: () => import('@/components/examples/MultiAgentChat').then((m) => ({ default: m.MultiAgentChat })),
  MultiModelChat: () => import('@/components/examples/MultiModelChat').then((m) => ({ default: m.MultiModelChat })),
  AgentActions: () => import('@/components/examples/AgentActions').then((m) => ({ default: m.AgentActions })),
  ShadcnChat: () => import('@/components/examples/ShadcnChat').then((m) => ({ default: m.ShadcnChat })),
  MuiChat: () => import('@/components/examples/MuiChat').then((m) => ({ default: m.MuiChat })),
}

export function LiveExample({ meta }: { meta: ShowcaseMeta }) {
  const Component = useMemo(() => {
    const loader = LOADERS[meta.module]
    if (!loader) {
      const Missing = () => <p className="text-red-400">Module not registered: {meta.module}</p>
      Missing.displayName = 'MissingExample'
      return Missing
    }
    return dynamic(loader, { ssr: false, loading: () => <p className="text-ak-graphite">Loading…</p> })
  }, [meta.module])
  return <Component />
}
