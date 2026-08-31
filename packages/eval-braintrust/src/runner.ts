import { ErrorCodes, RuntimeError } from '@agentskit/core'
import type { Scorer, ScorerInput, ScorerResult } from './types'

export interface BraintrustRunOptions {
  apiKey?: string
  projectName: string
  experimentName?: string
  baseUrl?: string
  metadata?: Record<string, unknown>
  /** Remote upload is opt-in through an API key; raw case data is opt-in per field. */
  upload?: {
    includeInput?: boolean
    includeOutput?: boolean
    includeExpected?: boolean
    metadataKeys?: string[]
    maxFieldBytes?: number
  }
}

export interface ScoredCase {
  input: string
  output: string
  expected?: unknown
  metadata?: Record<string, unknown>
  scores: ScorerResult[]
  durationMs?: number
}

export interface ExperimentResult {
  projectName: string
  experimentName: string
  cases: ScoredCase[]
  summary: Record<string, { mean: number; n: number }>
  url?: string
  /** Non-fatal Braintrust SDK issues. Deterministic messages; never include secrets. */
  warnings?: string[]
}

interface BraintrustExperiment {
  log(p: Record<string, unknown>): unknown
  flush?(): unknown
  summarize?(): Promise<{ experimentUrl?: string }>
}

interface BraintrustModule {
  init(p: Record<string, unknown>): BraintrustExperiment | Promise<BraintrustExperiment>
}

const envOr = (k: string, fallback?: string): string | undefined => {
  if (typeof process === 'undefined' || !process.env) return fallback
  return process.env[k] ?? fallback
}

const WARN = {
  import: 'braintrust: import failed',
  init: 'braintrust: init failed',
  log: 'braintrust: log failed',
  flush: 'braintrust: flush failed',
  summarize: 'braintrust: summarize failed',
} as const

function isValidScorerResult(value: unknown): value is ScorerResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  if (typeof o.name !== 'string' || o.name.trim().length === 0) return false
  if (typeof o.score !== 'number' || !Number.isFinite(o.score) || o.score < 0 || o.score > 1) {
    return false
  }
  return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseAgentResult(value: unknown): {
  output: string
  metadata?: Record<string, unknown>
} {
  if (!isRecord(value) || typeof value.output !== 'string') {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'Invalid Braintrust agent result: output must be a string',
    })
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'Invalid Braintrust agent result: metadata must be an object',
    })
  }
  return {
    output: value.output,
    ...(value.metadata !== undefined ? { metadata: value.metadata } : {}),
  }
}

function scorerError(
  index: number,
  scorer: Scorer,
  rationale: string,
): ScorerResult {
  const scorerName = typeof scorer === 'function' && scorer.name ? scorer.name : undefined
  return {
    name: 'scorer_error',
    score: 0,
    rationale,
    metadata: {
      scorerIndex: index,
      ...(scorerName !== undefined ? { scorerName } : {}),
    },
  }
}

function uploadField(value: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(value)
  if (bytes.byteLength <= maxBytes) return value
  return new TextDecoder().decode(bytes.slice(0, maxBytes))
}

function remoteMetadata(
  metadata: Record<string, unknown> | undefined,
  keys: string[] | undefined,
  maxBytes: number,
): Record<string, string> {
  if (!metadata || !keys) return {}
  const out: Record<string, string> = {}
  for (const key of keys) {
    const value = metadata[key]
    if (value === undefined) continue
    try {
      out[key] = uploadField(JSON.stringify(value), maxBytes)
    } catch {
      out[key] = '[unserializable]'
    }
  }
  return out
}

export async function scoreCase(
  scorers: Scorer[],
  args: ScorerInput,
): Promise<ScorerResult[]> {
  const out: ScorerResult[] = []
  const scorerList = scorers.slice()
  for (let i = 0; i < scorerList.length; i++) {
    const s = scorerList[i]!
    try {
      const result = await s(args)
      if (!isValidScorerResult(result)) {
        out.push(
          scorerError(
            i,
            s,
            'invalid scorer result: expected { name: non-empty string, score: finite number in [0, 1] }',
          ),
        )
        continue
      }
      out.push(result)
    } catch (err) {
      out.push(
        scorerError(i, s, err instanceof Error ? err.message : String(err)),
      )
    }
  }
  return out
}

export function summarize(cases: ScoredCase[]): Record<string, { mean: number; n: number }> {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const c of cases) {
    for (const s of c.scores) {
      if (!isValidScorerResult(s)) {
        throw new RuntimeError({
          code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
          message: 'Cannot summarize invalid scorer result',
        })
      }
      const cur = acc.get(s.name) ?? { sum: 0, n: 0 }
      cur.sum += s.score
      cur.n += 1
      acc.set(s.name, cur)
    }
  }
  const out: Record<string, { mean: number; n: number }> = {}
  for (const [name, { sum, n }] of acc) {
    out[name] = { mean: n > 0 ? sum / n : 0, n }
  }
  return out
}

export interface RunBraintrustEvalArgs<TCase extends ScorerInput = ScorerInput> {
  cases: TCase[]
  agent: (input: string) => Promise<{ output: string; metadata?: Record<string, unknown> }>
  scorers: Scorer[]
  options: BraintrustRunOptions
}

export interface RunBraintrustEvalInternals {
  bt?: BraintrustModule
}

export async function runBraintrustEval<TCase extends ScorerInput = ScorerInput>(
  args: RunBraintrustEvalArgs<TCase>,
  internals: RunBraintrustEvalInternals = {},
): Promise<ExperimentResult> {
  const { cases, agent, scorers, options } = args
  const apiKey = options.apiKey ?? envOr('BRAINTRUST_API_KEY')
  const baseUrl = options.baseUrl ?? envOr('BRAINTRUST_BASE_URL')
  const shouldUpload = Boolean(apiKey)
  const warnings = new Set<string>()
  const upload = options.upload ?? {}
  const maxFieldBytes = upload.maxFieldBytes ?? 4096
  if (!Number.isInteger(maxFieldBytes) || maxFieldBytes < 1 || maxFieldBytes > 1_048_576) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'upload.maxFieldBytes must be an integer in [1, 1048576]',
    })
  }

  let experiment: BraintrustExperiment | null = null

  // Never import or initialize the Braintrust SDK without an apiKey.
  if (shouldUpload) {
    try {
      const mod =
        internals.bt ?? ((await import('braintrust')) as unknown as BraintrustModule)
      try {
        experiment = await mod.init({
          project: options.projectName,
          experiment: options.experimentName,
          apiKey,
          appUrl: baseUrl,
          metadata: options.metadata,
        })
      } catch {
        warnings.add(WARN.init)
        experiment = null
      }
    } catch {
      warnings.add(WARN.import)
      experiment = null
    }
  }

  const out: ScoredCase[] = []
  for (const c of cases) {
    const t0 = Date.now()
    let output = ''
    let runMeta: Record<string, unknown> | undefined
    try {
      const r = parseAgentResult(await agent(c.input))
      output = r.output
      runMeta = r.metadata
    } catch (err) {
      runMeta = {
        primaryError: err instanceof Error ? err.message : String(err),
        crashed: true,
        uncaughtException: err instanceof Error ? err.name : String(err),
      }
    }
    const scores = await scoreCase(scorers, {
      input: c.input,
      output,
      expected: c.expected,
      metadata: { ...(c.metadata ?? {}), ...(runMeta ?? {}) },
    })
    const durationMs = Date.now() - t0
    const scored: ScoredCase = {
      input: c.input,
      output,
      expected: c.expected,
      metadata: { ...(c.metadata ?? {}), ...(runMeta ?? {}) },
      scores,
      durationMs,
    }
    out.push(scored)

    if (experiment) {
      try {
        const uploadMetadata = remoteMetadata(
          { ...(c.metadata ?? {}), ...(runMeta ?? {}) },
          upload.metadataKeys,
          maxFieldBytes,
        )
        await Promise.resolve(
          experiment.log({
            scores: Object.fromEntries(scores.map(s => [s.name, s.score])),
            metadata: { ...uploadMetadata, durationMs: String(durationMs) },
            ...(upload.includeInput ? { input: uploadField(c.input, maxFieldBytes) } : {}),
            ...(upload.includeOutput ? { output: uploadField(output, maxFieldBytes) } : {}),
            ...(upload.includeExpected
              ? { expected: uploadField(JSON.stringify(c.expected) ?? 'undefined', maxFieldBytes) }
              : {}),
          }),
        )
      } catch {
        warnings.add(WARN.log)
      }
    }
  }

  if (experiment?.flush) {
    try {
      await Promise.resolve(experiment.flush())
    } catch {
      warnings.add(WARN.flush)
    }
  }

  let url: string | undefined
  if (experiment?.summarize) {
    try {
      const s = await experiment.summarize()
      url = s.experimentUrl
    } catch {
      warnings.add(WARN.summarize)
    }
  }

  return {
    projectName: options.projectName,
    experimentName: options.experimentName ?? 'agentskit-eval',
    cases: out,
    summary: summarize(out),
    url,
    ...(warnings.size > 0 ? { warnings: [...warnings] } : {}),
  }
}
