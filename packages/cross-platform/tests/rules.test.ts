import { describe, expect, it } from 'vitest'
import { PORTABILITY_RULES } from '../src/lint/rules'
import { scanText } from '../src/lint/scan'

function rulesFor(line: string): string[] {
  return scanText('f.ts', line).map(finding => finding.rule)
}

describe('portability rules', () => {
  it.each([
    ["import { spawn } from 'node:child_process'", 'child-process-import'],
    ["const cp = require('child_process')", 'child-process-import'],
    ["await import('node:child_process')", 'child-process-import'],
    ["import spawn from 'cross-spawn'", 'cross-spawn-import'],
    ["const root = new URL('..', import.meta.url).pathname", 'url-pathname'],
    ["spawn('pnpm', args, { shell: process.platform === 'win32' })", 'platform-shell'],
    ['spawnSync(cmd, { shell: true })', 'platform-shell'],
    ["out.split('\\n')", 'split-newline'],
    ['out.split("\\n")', 'split-newline'],
    ["p.replace(/\\\\/g, '/')", 'manual-slash-normalize'],
    ["p.replaceAll('\\\\', '/')", 'manual-slash-normalize'],
    ["rel.split(sep).join('/')", 'manual-slash-normalize'],
    ["rel.split(path.sep).join('/')", 'manual-slash-normalize'],
    ["const dir = '/tmp/work'", 'hardcoded-tmp'],
    ['const home = process.env.HOME', 'home-env'],
    ["const home = process.env['HOME']", 'home-env'],
    ['process.kill(-child.pid, "SIGTERM")', 'process-group-kill'],
  ])('flags %s', (line, rule) => {
    expect(rulesFor(line)).toContain(rule)
  })

  it.each([
    "import { spawnProcess } from '@agentskit/cross-platform'",
    "const lines = splitLines(out)",
    "spawn(cmd, { shell: false })",
    "const home = process.env.HOMEBREW_PREFIX",
    "process.kill(pid, 'SIGTERM')",
    "const dir = tempDir()",
    "text.split('\\t')",
  ])('does not flag %s', line => {
    expect(rulesFor(line)).toEqual([])
  })

  it('honours the ignore directive on the line or the line above', () => {
    expect(scanText('f.ts', "import 'node:child_process' // cross-platform-ignore: test fixture")).toEqual([])
    expect(scanText('f.ts', "// cross-platform-ignore: posix-only script\nimport 'node:child_process'")).toEqual([])
    expect(scanText('f.ts', "// cross-platform-ignore:\nimport 'node:child_process'")).toHaveLength(1)
  })

  it('reports file, line and fix', () => {
    const [finding] = scanText('src/a.ts', "\nimport 'node:child_process'\r\n")
    expect(finding).toMatchObject({ file: 'src/a.ts', line: 2, rule: 'child-process-import' })
    expect(finding?.fix).toContain('@agentskit/cross-platform')
  })

  it('has unique ids and a fix for every rule', () => {
    const ids = PORTABILITY_RULES.map(rule => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const rule of PORTABILITY_RULES) expect(rule.fix).toMatch(/\(\)/)
  })
})
