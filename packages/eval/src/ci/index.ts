import { ConfigError, ErrorCodes, type EvalResult } from '@agentskit/core'
import { renderGitHubAnnotations, renderJUnit, renderMarkdown } from './reporters'

export { renderJUnit, renderMarkdown, renderGitHubAnnotations } from './reporters'

export interface CiReportOptions {
  suiteName: string
  result: EvalResult
  /** Accuracy ≥ this fails the process. Default 1.0 (all cases pass). */
  minAccuracy?: number
  /** Directory to write artifacts into. Default `./agentskit-evals`. */
  outDir?: string
  /** Filename prefix for artifacts. Default `report`. */
  prefix?: string
  /** Emit workflow annotations. Default: detect via `GITHUB_ACTIONS=true`. */
  annotations?: boolean
  /** Append markdown to `$GITHUB_STEP_SUMMARY`. Default: detect the env var. */
  stepSummary?: boolean
}

export interface CiReportOutput {
  junit: string
  markdown: string
  pass: boolean
  minAccuracy: number
  accuracy: number
}

function assertUnitInterval(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${name} must be a finite number in [0, 1]`,
    })
  }
  return value
}

/**
 * One-shot CI reporter. Writes `report.xml` (JUnit) + `report.md`,
 * optionally appends the markdown to `$GITHUB_STEP_SUMMARY`, emits
 * annotations, and returns pass/fail against `minAccuracy`. Designed
 * to be wired up as a GitHub Actions `run:` step.
 *
 * Does **not** call `process.exit` — the caller decides how to fail CI.
 */
export async function reportToCi(options: CiReportOptions): Promise<CiReportOutput> {
  const outDir = options.outDir ?? 'agentskit-evals'
  const prefix = options.prefix ?? 'report'
  const minAccuracy = assertUnitInterval(options.minAccuracy ?? 1, 'minAccuracy')
  const annotations = options.annotations ?? process.env?.GITHUB_ACTIONS === 'true'
  const stepSummary = options.stepSummary ?? Boolean(process.env?.GITHUB_STEP_SUMMARY)

  const junit = renderJUnit(options.suiteName, options.result)
  const markdown = renderMarkdown(options.suiteName, options.result)

  const { writeFile, mkdir, appendFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `${prefix}.xml`), junit, 'utf8')
  await writeFile(join(outDir, `${prefix}.md`), markdown, 'utf8')

  if (stepSummary && process.env?.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, 'utf8')
  }
  if (annotations) {
    process.stdout.write(renderGitHubAnnotations(options.suiteName, options.result))
  }

  return {
    junit,
    markdown,
    accuracy: options.result.accuracy,
    minAccuracy,
    pass: options.result.accuracy >= minAccuracy,
  }
}
