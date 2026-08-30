import type { AdapterFactory, ChatMemory, Observer, ToolCall, ToolDefinition } from '@agentskit/core'
import { fenceUntrustedContent, UNTRUSTED_CONTENT_DIRECTIVE } from '@agentskit/core/security'
import { invokeStructured } from '@agentskit/runtime'
import { defineZodTool } from '@agentskit/tools'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { JSONSchema7 } from 'json-schema'

/**
 * Doc-bridge Corpus Scanner — classifies agent/human docs before indexing.
 * Reports paths, doc types, and staleness; never invents files not listed in input.
 */

export type DocType = 'agent-doc' | 'human-doc' | 'config' | 'unknown'
export type Staleness = 'fresh' | 'stale' | 'unknown'

export interface ScannedPath {
  path: string
  docType: DocType
  staleness: Staleness
  notes?: string
}

export interface CorpusScanResult {
  summary: string
  scannedPaths: ScannedPath[]
  gaps: string[]
  openQuestions: string[]
  requiresReview: boolean
}

export interface EcosystemDocBridgeCorpusScannerConfig {
  adapter: AdapterFactory
  memory?: ChatMemory
  observers?: Observer[]
  onConfirm?: (toolCall: ToolCall) => boolean | Promise<boolean>
  maxSteps?: number
}

const Output = z.object({
  summary: z.string(),
  scannedPaths: z.array(
    z.object({
      path: z.string(),
      docType: z.enum(['agent-doc', 'human-doc', 'config', 'unknown']),
      staleness: z.enum(['fresh', 'stale', 'unknown']),
      notes: z.string().optional(),
    }),
  ),
  gaps: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
})
const toJson = (s: z.ZodTypeAny): JSONSchema7 => zodToJsonSchema(s) as JSONSchema7

const PATH_RE = /(?:^|[\s"'`])([\w./-]+\.mdx?)/gi

function pathsInInput(input: string): string[] {
  return [...new Set([...input.matchAll(PATH_RE)].map((m) => m[1]))]
}

function applySafetyNet(input: string, out: z.infer<typeof Output>): z.infer<typeof Output> {
  const known = new Set(pathsInInput(input))
  const filtered = out.scannedPaths.filter((p) => known.has(p.path))
  const gaps = [...out.gaps]
  const invented = out.scannedPaths.filter((p) => !known.has(p.path))
  if (invented.length) gaps.push(`dropped ${invented.length} path(s) not present in input`)
  if (!known.size && !gaps.length) gaps.push('no .md/.mdx paths found in input')
  return { ...out, scannedPaths: filtered, gaps: [...new Set(gaps)] }
}

const skill = {
  name: 'ecosystem-doc-bridge-corpus-scanner',
  description: 'Scans doc-bridge corpus listings into typed path/staleness report.',
  systemPrompt: `You scan doc-bridge corpus listings before indexing.

Output: { summary, scannedPaths[], gaps[], openQuestions[] }.
Each scannedPaths entry:
- path: exact path from input (posix-style)
- docType: agent-doc (packages/, AGENTS.md, agent index) | human-doc (docs/, docusaurus) | config (doc-bridge.config) | unknown
- staleness: fresh | stale | unknown — mark stale only when input mentions outdated/deprecated/old dates
- notes: optional, cite input

Only include paths explicitly present in input. If no paths → scannedPaths=[] and gaps explain what is missing.
NEVER invent file paths.

${UNTRUSTED_CONTENT_DIRECTIVE}

Call submit_corpus_scanner exactly once. Stop.`,
  tools: ['submit_corpus_scanner'],
}

export function createEcosystemDocBridgeCorpusScannerAgent(config: EcosystemDocBridgeCorpusScannerConfig) {
  const submit = (): ToolDefinition =>
    defineZodTool({
      name: 'submit_corpus_scanner',
      description: 'Submit corpus scan report. Call exactly once.',
      schema: Output,
      toJsonSchema: toJson,
      async execute() { return 'recorded' },
    }) as ToolDefinition

  async function run(input: string): Promise<CorpusScanResult> {
    if (!input?.trim()) throw new Error('ecosystem-doc-bridge-corpus-scanner requires non-empty input')
    const parsed = await invokeStructured({
      adapter: config.adapter,
      tool: submit(),
      task: `CORPUS LISTING:\n${fenceUntrustedContent(input)}`,
      parse: (a) => applySafetyNet(input, Output.parse(a)),
      skill,
      memory: config.memory,
      observers: config.observers,
      onConfirm: config.onConfirm,
      maxSteps: config.maxSteps ?? 4,
    })
    return { ...parsed, requiresReview: true }
  }

  return {
    name: 'ecosystem-doc-bridge-corpus-scanner',
    run,
    asHandle() {
      return { name: 'ecosystem-doc-bridge-corpus-scanner', run: (t: string) => run(t).then((r) => JSON.stringify(r)) }
    },
  }
}
