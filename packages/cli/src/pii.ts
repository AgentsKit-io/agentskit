import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validatePIITaxonomy, type TaxonomyValidationResult } from '@agentskit/core/security'

export interface LintReport {
  file: string
  result: TaxonomyValidationResult
  ruleCount: number
}

export function lintTaxonomyFile(filePath: string): LintReport {
  const absolute = resolve(filePath)
  let raw: string
  try {
    raw = readFileSync(absolute, 'utf8')
  } catch (err) {
    return {
      file: absolute,
      ruleCount: 0,
      result: {
        ok: false,
        issues: [{ index: -1, path: '', message: `cannot read file: ${(err as Error).message}` }],
      },
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return {
      file: absolute,
      ruleCount: 0,
      result: {
        ok: false,
        issues: [{ index: -1, path: '', message: `invalid JSON: ${(err as Error).message}` }],
      },
    }
  }

  const result = validatePIITaxonomy(parsed)
  const ruleCount =
    parsed && typeof parsed === 'object' && Array.isArray((parsed as { rules?: unknown }).rules)
      ? ((parsed as { rules: unknown[] }).rules.length)
      : 0
  return { file: absolute, result, ruleCount }
}

export function renderLintReport(report: LintReport, opts: { color?: boolean } = {}): string {
  const { color = false } = opts
  const red = (s: string) => (color ? `[31m${s}[0m` : s)
  const green = (s: string) => (color ? `[32m${s}[0m` : s)
  const dim = (s: string) => (color ? `[2m${s}[0m` : s)

  const lines: string[] = []
  lines.push(dim(report.file))
  if (report.result.ok) {
    lines.push(green(`✓ valid · ${report.ruleCount} rule${report.ruleCount === 1 ? '' : 's'}`))
  } else {
    lines.push(red(`✗ ${report.result.issues.length} issue${report.result.issues.length === 1 ? '' : 's'}`))
    for (const issue of report.result.issues) {
      lines.push(`  ${red('•')} ${issue.path || '<root>'}: ${issue.message}`)
    }
  }
  return `${lines.join('\n')}\n`
}
