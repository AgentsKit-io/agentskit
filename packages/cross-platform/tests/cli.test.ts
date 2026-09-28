import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { removePath } from '../src/fs'
import { parseFlags, runCli } from '../src/lint/cli'

let cwd: string
let out: string[]
let err: string[]

const io = () => ({ cwd, log: (line: string) => out.push(line), error: (line: string) => err.push(line) })
const source = (name: string, text: string) => writeFile(join(cwd, 'src', name), text)

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'ak-cli-'))
  await mkdir(join(cwd, 'src'))
  out = []
  err = []
})

afterEach(async () => {
  await removePath(cwd)
})

describe('agentskit-cross-platform check', () => {
  it('accepts an absolute --baseline path', async () => {
    await source('a.ts', "import { spawn } from 'node:child_process'\n")
    const baseline = join(cwd, 'nested-baseline.json')
    expect(await runCli(['check', '--init', '--include', 'src', '--baseline', baseline], io())).toBe(0)
    expect(JSON.parse(await readFile(baseline, 'utf8'))).toMatchObject({ version: 1 })
    expect(await runCli(['check', '--baseline', baseline], io())).toBe(0)
  })

  it('prints usage', async () => {
    expect(await runCli([], io())).toBe(0)
    expect(await runCli(['--help'], io())).toBe(0)
    expect(await runCli(['nope'], io())).toBe(1)
    expect(out.join('\n')).toContain('Usage')
  })

  it('requires a baseline', async () => {
    expect(await runCli(['check'], io())).toBe(1)
    expect(err.join('\n')).toContain('--init')
  })

  it('initialises, passes, fails on regressions and tightens', async () => {
    await source('a.ts', "const lines = out.split('\\n')\n")
    expect(await runCli(['check', '--init', '--include', 'src', '--exclude', 'vendor/'], io())).toBe(0)
    const baseline = JSON.parse(await readFile(join(cwd, '.cross-platform-baseline.json'), 'utf8'))
    expect(baseline).toMatchObject({ version: 1, include: ['src'], exclude: ['vendor/'], entries: { 'src/a.ts': { 'split-newline': 1 } } })

    expect(await runCli(['check'], io())).toBe(0)
    expect(out.at(-1)).toContain('1 baselined')

    await source('b.ts', "import { spawn } from 'node:child_process'\n")
    expect(await runCli(['check'], io())).toBe(1)
    expect(err.join('\n')).toContain('src/b.ts:1 [child-process-import]')
    expect(await runCli(['check', '--json'], io())).toBe(1)
    expect(JSON.parse(out.at(-1) ?? '{}').regressions).toHaveLength(1)

    expect(await runCli(['check', '--update'], io())).toBe(1)
    expect(err.at(-1)).toContain('src/b.ts [child-process-import]')
    expect(await runCli(['check', '--update', '--allow-increase'], io())).toBe(0)

    await source('a.ts', 'const lines = splitLines(out)\n')
    await source('b.ts', '')
    expect(await runCli(['check'], io())).toBe(0)
    expect(out.join('\n')).toContain('can be tightened')
    expect(await runCli(['check', '--update', '--baseline', '.cross-platform-baseline.json'], io())).toBe(0)
    expect(JSON.parse(await readFile(join(cwd, '.cross-platform-baseline.json'), 'utf8')).entries).toEqual({})
  })

  it('rejects unknown options', () => {
    expect(() => parseFlags(['check', '--bogus'])).toThrow('Unknown option: --bogus')
    expect(parseFlags(['check', '--baseline'])).toMatchObject({ baseline: '.cross-platform-baseline.json' })
  })
})
