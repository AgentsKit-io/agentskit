#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../packages/cross-platform/dist/index.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const options = { outputDir: 'guardrail-report-output', previous: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--output-dir') options.outputDir = argv[++index]
    else if (arg === '--previous') options.previous = argv[++index]
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!options.outputDir) throw new Error('--output-dir requires a path')
  return options
}

async function run(command, args) {
  const result = await runCommand(command, args, { cwd: ROOT, maxOutputBytes: 32 * 1024 * 1024 })
  return {
    code: result.code ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.termination,
  }
}

function parseJsonOutput(output) {
  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== '{' && output[start] !== '[') continue
    const open = output[start]
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let quoted = false
    let escaped = false
    for (let end = start; end < output.length; end += 1) {
      const char = output[end]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') quoted = true
      else if (char === open) depth += 1
      else if (char === close) {
        depth -= 1
        if (depth === 0) {
          try { return JSON.parse(output.slice(start, end + 1)) } catch { break }
        }
      }
    }
  }
  throw new Error('command did not emit valid JSON')
}

async function collectJson(name, command, args, normalize) {
  try {
    const result = await run(command, args)
    const data = parseJsonOutput(result.stdout)
    return { ...normalize(data), status: result.code === 0 ? 'passed' : 'failed', error: result.error ?? null }
  } catch (error) {
    return { status: 'unavailable', error: `${name}: ${error.message}` }
  }
}

function sumBaselineEntries(relativePath) {
  const baseline = JSON.parse(readFileSync(path.join(ROOT, relativePath), 'utf8'))
  return Object.values(baseline.entries ?? {}).reduce((fileTotal, rules) =>
    fileTotal + Object.values(rules).reduce((ruleTotal, count) => ruleTotal + Number(count), 0), 0)
}

async function collectChecks() {
  const jsdoc = await collectJson('JSDoc coverage', process.execPath,
    ['scripts/check-jsdoc-coverage.mjs', '--json'], data => ({
      documented: data.documented,
      total: data.total,
      coveragePercent: data.coveragePercent,
      undocumented: data.undocumented,
      packages: data.packages,
      baselineGrowth: data.baselineGrowth?.length ?? 0,
    }))
  if (jsdoc.status === 'passed' && jsdoc.baselineGrowth > 0) jsdoc.status = 'failed'

  const publicApi = await collectJson('Public API snapshot', process.execPath,
    ['scripts/check-public-api-snapshot.mjs', '--json'], data => ({
      packages: data.packages,
      subpaths: data.subpaths,
      symbols: data.symbols,
      packageDetails: data.packageDetails,
      changes: data.changes?.length ?? 0,
    }))
  if (publicApi.status === 'passed' && publicApi.changes > 0) publicApi.status = 'failed'

  let closureBuild
  try {
    closureBuild = await run(process.execPath, ['scripts/size-core-closure.mjs'])
  } catch (error) {
    closureBuild = { code: 1, stderr: error.message }
  }
  const size = await collectJson('Bundle sizes', 'pnpm', ['exec', 'size-limit', '--json'], data => ({
    targets: Array.isArray(data) ? data.map(({ name, size, sizeLimit, passed }) => ({
      name, sizeBytes: size, limitBytes: sizeLimit, passed,
    })) : [],
  }))
  if (closureBuild.code !== 0) {
    size.status = 'unavailable'
    size.error = `size-core-closure: ${closureBuild.stderr.trim() || closureBuild.error || `exit ${closureBuild.code}`}`
  }
  if (!Array.isArray(size.targets) || size.targets.length === 0) size.status = 'unavailable'
  if (size.status === 'passed' && size.targets.some(target => !target.passed)) size.status = 'failed'

  const net = await collectJson('NET rules baseline', process.execPath,
    ['scripts/check-net-rules.mjs', '--json'], data => ({
      baselineCount: sumBaselineEntries('.net-rules-baseline.json'),
      regressions: data.regressions?.length ?? null,
      regressionDetails: data.regressions ?? [],
    }))
  if (net.status === 'passed' && net.regressions > 0) net.status = 'failed'

  const crossPlatform = await collectJson('Cross-platform baseline', process.execPath,
    ['scripts/check-cross-platform.mjs', '--json'], data => ({
      baselineCount: sumBaselineEntries('.cross-platform-baseline.json'),
      regressions: data.regressions?.length ?? null,
      improvements: data.improvements?.length ?? null,
      regressionDetails: data.regressions ?? [],
    }))
  if (crossPlatform.status === 'passed' && crossPlatform.regressions > 0) crossPlatform.status = 'failed'

  const coverageFloors = await collectJson('Coverage floors', process.execPath,
    ['scripts/check-coverage-floor.mjs', '--json'], data => ({
      checkedPackages: data.checkedPackages,
      floors: data.floors,
      packages: data.packages,
      errors: data.errors?.length ?? 0,
    }))
  if (coverageFloors.status === 'passed' && coverageFloors.errors > 0) coverageFloors.status = 'failed'

  const ciTiming = await collectJson('CI timing', 'pnpm', ['--silent', 'ci:timing', '--format', 'json'], data => ({
    workflow: data.workflow,
    sampledAt: data.sampledAt,
    requestedRunsPerCohort: data.requestedRunsPerCohort,
    cohorts: data.cohorts,
  }))

  return { jsdoc, publicApi, bundleSizes: size, netRules: net, crossPlatform, coverageFloors, ciTiming }
}

export function flattenNumbers(value, prefix = '', output = {}) {
  if (typeof value === 'number' && Number.isFinite(value)) output[prefix] = value
  else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const key = item && typeof item === 'object' && item.name ? item.name : index
      flattenNumbers(item, prefix ? `${prefix}.${key}` : String(key), output)
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'status' || key === 'error' || key === 'sampledAt') continue
      flattenNumbers(item, prefix ? `${prefix}.${key}` : key, output)
    }
  }
  return output
}

export function createDeltas(checks, previous) {
  if (!previous || previous.schemaVersion !== 1 || !previous.checks) return []
  const currentValues = flattenNumbers(checks)
  const previousValues = flattenNumbers(previous.checks)
  return Object.entries(currentValues)
    .filter(([key]) => typeof previousValues[key] === 'number')
    .map(([key, current]) => ({ path: key, previous: previousValues[key], current, delta: current - previousValues[key] }))
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined) return 'n/a'
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`
}

function deltasByPath(deltas) {
  return new Map(deltas.map(delta => [delta.path, delta]))
}

function deltaLabel(map, key, suffix = '') {
  const delta = map.get(key)
  if (!delta) return '—'
  const sign = delta.delta > 0 ? '+' : ''
  return `${sign}${formatNumber(delta.delta, suffix)}`
}

function markdownReport(report, previous) {
  const deltaMap = deltasByPath(report.deltas)
  const lines = [
    '# AgentsKit periodic guardrail report',
    '',
    `Generated: ${report.generatedAt}  `,
    `Commit: \`${report.source.commit}\`  `,
    `Working tree: ${report.source.dirty ? 'modified' : 'clean'}  `,
    `Previous report: ${previous ? previous.generatedAt ?? 'available' : 'not available'}`,
    '',
    '| Guardrail | Status | Current value | Change |',
    '| --- | --- | ---: | ---: |',
    `| JSDoc coverage | ${report.checks.jsdoc.status} | ${formatNumber(report.checks.jsdoc.coveragePercent, '%')} (${report.checks.jsdoc.documented}/${report.checks.jsdoc.total}) | ${deltaLabel(deltaMap, 'jsdoc.coveragePercent', ' pp')} |`,
    `| Public API | ${report.checks.publicApi.status} | ${formatNumber(report.checks.publicApi.packages)} packages; ${formatNumber(report.checks.publicApi.subpaths)} subpaths; ${formatNumber(report.checks.publicApi.symbols)} symbols | ${deltaLabel(deltaMap, 'publicApi.symbols')} symbols |`,
    `| NET baseline | ${report.checks.netRules.status} | ${formatNumber(report.checks.netRules.baselineCount)} recorded; ${formatNumber(report.checks.netRules.regressions)} regressions | ${deltaLabel(deltaMap, 'netRules.baselineCount')} |`,
    `| Cross-platform baseline | ${report.checks.crossPlatform.status} | ${formatNumber(report.checks.crossPlatform.baselineCount)} recorded; ${formatNumber(report.checks.crossPlatform.regressions)} regressions | ${deltaLabel(deltaMap, 'crossPlatform.baselineCount')} |`,
    `| Coverage floors | ${report.checks.coverageFloors.status} | ${formatNumber(report.checks.coverageFloors.checkedPackages)} packages checked | ${deltaLabel(deltaMap, 'coverageFloors.checkedPackages')} |`,
    `| Bundle sizes | ${report.checks.bundleSizes.status} | ${report.checks.bundleSizes.targets?.length ?? 'n/a'} configured targets | — |`,
    `| CI timing | ${report.checks.ciTiming.status} | ${report.checks.ciTiming.requestedRunsPerCohort ?? 'n/a'} runs per cohort | — |`,
    '',
    '## Bundle sizes by configured target',
    '',
    '| Target | Current (gzip) | Limit (gzip) | Status | Change |',
    '| --- | ---: | ---: | --- | ---: |',
  ]
  for (const target of report.checks.bundleSizes.targets ?? []) {
    lines.push(`| ${target.name} | ${formatNumber(target.sizeBytes, ' B')} | ${formatNumber(target.limitBytes, ' B')} | ${target.passed ? 'passed' : 'failed'} | ${deltaLabel(deltaMap, `bundleSizes.targets.${target.name}.sizeBytes`, ' B')} |`)
  }
  lines.push('', '## JSDoc coverage by package', '', '| Package | Documented | Total | Coverage | Change |', '| --- | ---: | ---: | ---: | ---: |')
  for (const [name, stats] of Object.entries(report.checks.jsdoc.packages ?? {})) {
    const percent = stats.total === 0 ? null : (stats.documented / stats.total) * 100
    lines.push(`| ${name} | ${stats.documented} | ${stats.total} | ${formatNumber(percent, '%')} | ${deltaLabel(deltaMap, `jsdoc.packages.${name}.documented`)} documented |`)
  }
  lines.push('', '## Public API size by package', '', '| Package | Subpaths | Symbols | Subpath change | Symbol change |', '| --- | ---: | ---: | ---: | ---: |')
  for (const [name, stats] of Object.entries(report.checks.publicApi.packageDetails ?? {})) {
    lines.push(`| ${name} | ${stats.subpaths} | ${stats.symbols} | ${deltaLabel(deltaMap, `publicApi.packageDetails.${name}.subpaths`)} | ${deltaLabel(deltaMap, `publicApi.packageDetails.${name}.symbols`)} |`)
  }
  lines.push('', '## Coverage thresholds by package', '', '| Package | Tier | Floor | Configured | Status | Change |', '| --- | --- | ---: | ---: | --- | ---: |')
  for (const pkg of report.checks.coverageFloors.packages ?? []) {
    lines.push(`| ${pkg.name} | ${pkg.tier} | ${pkg.floor}% | ${pkg.threshold}% | ${pkg.passed ? 'passed' : 'failed'} | ${deltaLabel(deltaMap, `coverageFloors.packages.${pkg.name}.threshold`, ' pp')} |`)
  }
  lines.push('', '## CI timing', '')
  for (const cohort of report.checks.ciTiming.cohorts ?? []) {
    lines.push(`### ${cohort.name}`, '', '| Metric | Runs | p50 | p90 | Change (p50) |', '| --- | ---: | ---: | ---: | ---: |',
      `| Queue | ${cohort.queue.samples} | ${formatNumber(cohort.queue.p50Seconds, ' s')} | ${formatNumber(cohort.queue.p90Seconds, ' s')} | ${deltaLabel(deltaMap, `ciTiming.cohorts.${cohort.name}.queue.p50Seconds`, ' s')} |`,
      `| Total duration | ${cohort.totalDuration.samples} | ${formatNumber(cohort.totalDuration.p50Seconds, ' s')} | ${formatNumber(cohort.totalDuration.p90Seconds, ' s')} | ${deltaLabel(deltaMap, `ciTiming.cohorts.${cohort.name}.totalDuration.p50Seconds`, ' s')} |`,
      `| Failures | ${cohort.runs} | ${formatNumber(cohort.failures)} (${formatNumber(cohort.failureRate * 100, '%')}) | — | ${deltaLabel(deltaMap, `ciTiming.cohorts.${cohort.name}.failures`)} |`,
      `| Reruns | ${cohort.runs} | ${formatNumber(cohort.reruns)} (${formatNumber(cohort.rerunRate * 100, '%')}) | — | ${deltaLabel(deltaMap, `ciTiming.cohorts.${cohort.name}.reruns`)} |`, '')
  }
  const unavailable = Object.entries(report.checks).filter(([, check]) => check.status === 'unavailable')
  if (unavailable.length) {
    lines.push('## Unavailable data', '', ...unavailable.map(([name, check]) => `- ${name}: ${check.error ?? 'collector could not read a JSON result'}`), '')
  }
  const regressions = Object.entries(report.checks)
    .flatMap(([name, check]) => (check.regressionDetails ?? []).map(item => ({ name, item })))
  if (regressions.length) {
    lines.push('## Guardrail regressions', '', ...regressions.map(({ name, item }) =>
      `- ${name}: \`${item.file}:${item.line}\` [${item.rule}] ${item.message}`), '')
  }
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    process.stdout.write('Usage: node scripts/guardrail-report.mjs [--output-dir PATH] [--previous PATH]\n')
    return
  }
  const commitResult = await run('git', ['rev-parse', 'HEAD'])
  const gitStatus = await run('git', ['status', '--porcelain'])
  const previous = options.previous ? JSON.parse(readFileSync(path.resolve(ROOT, options.previous), 'utf8')) : null
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      repository: 'AgentsKit-io/agentskit',
      commit: commitResult.stdout.trim() || null,
      dirty: gitStatus.stdout.trim().length > 0,
    },
    checks: await collectChecks(),
    deltas: [],
  }
  report.deltas = createDeltas(report.checks, previous)
  const outputDir = path.resolve(ROOT, options.outputDir)
  mkdirSync(outputDir, { recursive: true })
  const jsonPath = path.join(outputDir, 'report.json')
  const markdownPath = path.join(outputDir, 'report.md')
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(markdownPath, markdownReport(report, previous))
  process.stdout.write(`${markdownPath}\n${jsonPath}\n`)
  if (Object.values(report.checks).some(check => check.status === 'unavailable')) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
