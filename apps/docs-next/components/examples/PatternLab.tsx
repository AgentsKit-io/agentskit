'use client'

import { useMemo, useState } from 'react'
import { useChat, ChatContainer, InputBar } from '@agentskit/react'
import '@/styles/agentskit-theme.css'
import { createMockAdapter, initialAssistant, toolsFor, type Turn } from './_shared/mock-adapter'
import { MdRenderer } from './_shared/md-renderer'
import { ToolBadge } from './_shared/tool-badge'

type PatternScenario = {
  id: string
  label: string
  tagline: string
  boundary: string
  turns: Turn[]
}

export const PATTERN_LAB_SCENARIOS: PatternScenario[] = [
  {
    id: 'support-escalation',
    label: 'Support escalation',
    tagline: 'PII cleanup → evidence → human handoff',
    boundary: 'Draft only. A support agent reviews before posting or assigning severity.',
    turns: [{
      toolCalls: [
        { name: 'redact_sensitive_fields', args: { fields: ['email', 'phone', 'account_id'] }, result: { removed: ['email', 'account_id'], preserved: ['error_code', 'steps'] }, durationMs: 180 },
        { name: 'assemble_escalation', args: { sections: ['impact', 'tried', 'need', 'sla'] }, result: { evidence: 4, missing: ['reproduction_video'] }, durationMs: 220 },
      ],
      text: '### Internal escalation draft\\n\\n- **Impact:** checkout fails after the third step for the supplied synthetic case\\n- **Tried:** cache reset, browser replay, and version check\\n- **Need:** engineering reproduction with the sanitized error code\\n- **SLA:** confirm owner and response window\\n- **Evidence gap:** reproduction video is still missing\\n\\n**Human review:** verify the reproduction and severity before handoff.',
    }],
  },
  {
    id: 'api-contract',
    label: 'API contract review',
    tagline: 'Diff → evidence → verification path',
    boundary: 'Advisory review. Maintainers decide compatibility, migration, and release timing.',
    turns: [{
      toolCalls: [
        { name: 'compare_contracts', args: { before: 'v1.json', after: 'v2.json' }, result: { breaking: 1, nonBreaking: 2 }, durationMs: 200 },
        { name: 'check_consumers', args: { packages: ['web', 'cli'] }, result: { affected: ['cli'], missing: ['runtime fixture'] }, durationMs: 240 },
      ],
      text: '### API contract review\\n\\n- **Breaking:** `error.code` changed from optional to required\\n- **Non-breaking:** additive `request.traceId`; documented enum value\\n- **Affected consumer:** `cli` has no fallback for the required field\\n- **Next check:** add a runtime fixture and replay both adapter contracts\\n\\n**Human review:** decide whether to migrate the consumer or preserve compatibility.',
    }],
  },
  {
    id: 'fact-check',
    label: 'Fact-check a claim',
    tagline: 'Claims → sources → editorial queue',
    boundary: 'Editorial draft. A human verifies sources and approves any public wording.',
    turns: [{
      toolCalls: [
        { name: 'extract_claims', args: { source: 'synthetic-case-note.md' }, result: { claims: 2 }, durationMs: 160 },
        { name: 'check_sources', args: { sources: ['timing-notes.md', 'case-note.md'] }, result: { supported: 1, unresolved: 1, conflict: false }, durationMs: 210 },
      ],
      text: '### Claim review\\n\\n- **Supported:** the synthetic pilot reduced review time, according to `timing-notes.md`\\n- **Unresolved:** the workflow is production-ready; no readiness evidence was supplied\\n\\n**Editorial queue:** verify the sample, date, and denominator before using any number publicly.',
    }],
  },
]

export function PatternLab() {
  const [selectedId, setSelectedId] = useState(PATTERN_LAB_SCENARIOS[0].id)
  const selected = PATTERN_LAB_SCENARIOS.find((scenario) => scenario.id === selectedId) ?? PATTERN_LAB_SCENARIOS[0]

  return (
    <div data-ak-example className="overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <div className="border-b border-ak-border bg-ak-midnight/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-foam">Pattern lab</div>
            <h2 className="mt-1 font-display text-lg font-semibold text-ak-foam">Evidence-first workflows</h2>
            <p className="mt-1 max-w-2xl text-sm text-ak-graphite">Three deterministic Registry-shaped workflows. No network, credentials, or external actions.</p>
          </div>
          <span className="rounded-full border border-ak-green/30 bg-ak-green/5 px-2 py-1 font-mono text-[10px] text-ak-green">synthetic replay</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Pattern lab scenarios">
          {PATTERN_LAB_SCENARIOS.map((scenario) => {
            const active = scenario.id === selected.id
            return (
              <button key={scenario.id} type="button" role="tab" aria-selected={active} onClick={() => setSelectedId(scenario.id)} className={`min-h-11 rounded-md border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue ${active ? 'border-ak-foam bg-ak-foam/10 text-ak-foam' : 'border-ak-border text-ak-graphite hover:border-ak-foam hover:text-ak-foam'}`}>
                <span className="block font-mono text-xs">{scenario.label}</span>
                <span className="mt-1 block text-xs opacity-80">{scenario.tagline}</span>
              </button>
            )
          })}
        </div>
      </div>
      <PatternConversation key={selected.id} scenario={selected} />
    </div>
  )
}

function PatternConversation({ scenario }: { scenario: PatternScenario }) {
  const adapter = useMemo(() => createMockAdapter(scenario.turns, 100), [scenario])
  const tools = useMemo(() => toolsFor(scenario.turns), [scenario])
  const chat = useChat({ adapter, tools, maxToolIterations: 1, initialMessages: [initialAssistant(`Try this synthetic ${scenario.label.toLowerCase()} request. The result stays advisory.`)] })

  return (
    <div>
      <ChatContainer className="flex min-h-[360px] flex-col gap-3 p-4">
        {chat.messages.filter((message) => message.role !== 'tool').map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            {message.toolCalls?.map((call) => <ToolBadge key={call.id} call={call} />)}
            {message.content ? <div data-ak-message data-ak-role={message.role} className={`rounded-lg p-3 ${message.role === 'user' ? 'ml-auto max-w-[85%] bg-ak-midnight/60' : 'bg-ak-midnight/30'}`}><MdRenderer content={message.content} /></div> : null}
          </div>
        ))}
      </ChatContainer>
      <div className="border-t border-ak-border px-4 pt-3 text-xs text-ak-graphite"><span className="font-mono text-ak-foam">Boundary:</span> {scenario.boundary}</div>
      <div className="p-4"><InputBar chat={chat} /></div>
    </div>
  )
}
