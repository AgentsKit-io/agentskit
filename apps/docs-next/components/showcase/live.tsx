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
  SandboxRunner: () => import('@/components/examples/SandboxRunner').then((m) => ({ default: m.SandboxRunner })),
  ObservabilityTrace: () => import('@/components/examples/ObservabilityTrace').then((m) => ({ default: m.ObservabilityTrace })),
  MemoryRecallExample: () => import('@/components/examples/MemoryRecallExample').then((m) => ({ default: m.MemoryRecallExample })),
  EvalSuite: () => import('@/components/examples/EvalSuite').then((m) => ({ default: m.EvalSuite })),
  SlackIntegration: () => import('@/components/examples/SlackIntegration').then((m) => ({ default: m.SlackIntegration })),
  InkTerminal: () => import('@/components/examples/InkTerminal').then((m) => ({ default: m.InkTerminal })),
  SkillsExample: () => import('@/components/examples/SkillsExample').then((m) => ({ default: m.SkillsExample })),
  RuntimeReAct: () => import('@/components/examples/RuntimeReAct').then((m) => ({ default: m.RuntimeReAct })),
  ProviderFanout: () => import('@/components/examples/ProviderFanout').then((m) => ({ default: m.ProviderFanout })),
  RAGCiteExample: () => import('@/components/examples/RAGCiteExample').then((m) => ({ default: m.RAGCiteExample })),
  PatternLab: () => import('@/components/examples/PatternLab').then((m) => ({ default: m.PatternLab })),
}

export function LiveExample({ meta }: { meta: ShowcaseMeta }) {
  const Component = useMemo(() => {
    const loader = LOADERS[meta.module]
    if (!loader) {
      const Missing = () => <p className="text-red-400">Module not registered: {meta.module}</p>
      Missing.displayName = 'MissingExample'
      return Missing
    }
    return dynamic(loader, { ssr: false, loading: () => <ExampleSkeleton /> })
  }, [meta.module])
  return <Component />
}

export function ExampleSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[360px] w-full flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <div className="flex items-center gap-2 border-b border-ak-border px-4 py-3">
        <span className="ak-skel h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <span className="ak-skel block h-3 w-32 rounded" />
          <span className="ak-skel block h-2 w-20 rounded" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <SkelBubble align="start" w="w-3/5" />
        <SkelBubble align="end" w="w-2/5" />
        <SkelBubble align="start" w="w-1/2" />
      </div>
      <div className="flex items-center gap-2 border-t border-ak-border p-3">
        <span className="ak-skel h-9 flex-1 rounded" />
        <span className="ak-skel h-9 w-16 rounded" />
      </div>
    </div>
  )
}

function SkelBubble({ align, w }: { align: 'start' | 'end'; w: string }) {
  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <span className={`ak-skel h-10 ${w} rounded-2xl`} />
    </div>
  )
}
