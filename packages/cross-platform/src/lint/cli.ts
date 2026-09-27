import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CrossPlatformError, CrossPlatformErrorCodes } from '../errors'
import { writeFileAtomic } from '../fs'
import { compareToBaseline, tightenBaseline, type Baseline } from './baseline'
import { scanRepository, type Finding } from './scan'

const DEFAULT_BASELINE = '.cross-platform-baseline.json'
const DEFAULT_INCLUDE = ['packages', 'scripts', 'src', 'apps']

export interface CliIo {
  cwd: string
  log: (line: string) => void
  error: (line: string) => void
}

const USAGE = `Usage: agentskit-cross-platform check [options]

Scans source for patterns that break on Windows or across runtimes and
compares them to a ratchet baseline (counts may only go down).

Options:
  --baseline <file>      Baseline path (default ${DEFAULT_BASELINE})
  --init                 Create the baseline from the current findings
  --include <a,b>        Directories to scan with --init (default ${DEFAULT_INCLUDE.join(',')})
  --exclude <a,b>        Path prefixes to skip with --init
  --update               Lower baseline counts to the current findings
  --allow-increase       With --update, also accept higher counts (needs review)
  --json                 Print findings as JSON`

interface Flags {
  command: string | undefined
  baseline: string
  init: boolean
  update: boolean
  allowIncrease: boolean
  json: boolean
  include: string[]
  exclude: string[]
}

function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map(item => item.trim()).filter(Boolean)
}

export function parseFlags(argv: readonly string[]): Flags {
  const flags: Flags = {
    command: argv[0],
    baseline: DEFAULT_BASELINE,
    init: false,
    update: false,
    allowIncrease: false,
    json: false,
    include: DEFAULT_INCLUDE,
    exclude: [],
  }
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--baseline') flags.baseline = argv[++i] ?? DEFAULT_BASELINE
    else if (arg === '--init') flags.init = true
    else if (arg === '--update') flags.update = true
    else if (arg === '--allow-increase') flags.allowIncrease = true
    else if (arg === '--json') flags.json = true
    else if (arg === '--include') flags.include = list(argv[++i])
    else if (arg === '--exclude') flags.exclude = list(argv[++i])
    else {
      throw new CrossPlatformError({ code: CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT, message: `Unknown option: ${arg}` })
    }
  }
  return flags
}

function format(finding: Finding): string {
  return `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}\n    → use ${finding.fix}`
}

async function readBaseline(path: string): Promise<Baseline | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Baseline
  } catch {
    return undefined
  }
}

async function saveBaseline(path: string, baseline: Baseline): Promise<void> {
  await writeFileAtomic(path, `${JSON.stringify(baseline, null, 2)}\n`)
}

/** Run the CLI; returns the process exit code. */
export async function runCli(argv: readonly string[], io: CliIo): Promise<number> {
  const flags = parseFlags(argv)
  if (flags.command !== 'check') {
    io.log(USAGE)
    return flags.command === undefined || flags.command === '--help' ? 0 : 1
  }
  const baselinePath = join(io.cwd, flags.baseline)
  const existing = await readBaseline(baselinePath)

  if (flags.init) {
    const findings = await scanRepository({ root: io.cwd, include: flags.include, exclude: flags.exclude })
    const empty: Baseline = { version: 1, include: flags.include, exclude: flags.exclude, entries: {} }
    await saveBaseline(baselinePath, tightenBaseline(findings, empty, true).baseline)
    io.log(`Baseline written to ${flags.baseline} with ${findings.length} existing finding(s).`)
    return 0
  }
  if (!existing) {
    io.error(`No baseline at ${flags.baseline}. Create it with: agentskit-cross-platform check --init`)
    return 1
  }

  const findings = await scanRepository({ root: io.cwd, include: existing.include, exclude: existing.exclude })
  if (flags.update) {
    const { baseline, increased } = tightenBaseline(findings, existing, flags.allowIncrease)
    if (increased.length > 0 && !flags.allowIncrease) {
      io.error(`Refusing to raise baseline counts (fix them or pass --allow-increase):\n  ${increased.join('\n  ')}`)
      return 1
    }
    await saveBaseline(baselinePath, baseline)
    io.log(`Baseline updated: ${findings.length} finding(s) remain.`)
    return 0
  }

  const { regressions, improvements } = compareToBaseline(findings, existing)
  if (flags.json) io.log(JSON.stringify({ regressions, improvements }, null, 2))
  else {
    for (const finding of regressions) io.error(format(finding))
    if (improvements.length > 0) {
      io.log(`${improvements.length} baseline entr${improvements.length === 1 ? 'y' : 'ies'} can be tightened: run with --update.`)
    }
  }
  if (regressions.length > 0) {
    io.error(`\n✗ ${regressions.length} new cross-platform issue(s). See https://www.agentskit.io/docs/reference/packages/cross-platform`)
    return 1
  }
  io.log(`✓ no new cross-platform issues (${findings.length} baselined)`)
  return 0
}
