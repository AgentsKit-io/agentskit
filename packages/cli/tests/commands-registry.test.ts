import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { registerAddCommand } from '../src/commands/add'
import { registerDiffCommand, registerUpdateCommand } from '../src/commands/registry-maintenance'

const AGENT = {
  id: 'x',
  title: 'X',
  description: 'an agent',
  category: 'support',
  packages: ['@agentskit/core', '@agentskit/runtime'],
  env: [{ name: 'OPENAI_API_KEY', description: 'key', required: true }],
  files: ['agent.ts'],
  skill: { name: 'x', description: 'an agent', systemPrompt: 'You are X.' },
  sources: [{ path: 'agent.ts', content: 'export const x = 1\n' }],
}

let origFetch: typeof globalThis.fetch
let out = ''
let origOut: typeof process.stdout.write
let origErr: typeof process.stderr.write
let origExit: typeof process.exit

beforeEach(() => {
  origFetch = globalThis.fetch
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(AGENT), { status: 200 })) as never
  out = ''
  origOut = process.stdout.write
  origErr = process.stderr.write
  origExit = process.exit
  process.stdout.write = ((s: string) => ((out += s), true)) as never
  process.stderr.write = ((s: string) => ((out += s), true)) as never
  process.exit = (() => undefined) as never
})
afterEach(() => {
  globalThis.fetch = origFetch
  process.stdout.write = origOut
  process.stderr.write = origErr
  process.exit = origExit
})

function cli(): Command {
  const p = new Command()
  p.exitOverride()
  registerAddCommand(p)
  registerDiffCommand(p)
  registerUpdateCommand(p)
  return p
}

describe('registry commands', () => {
  it('add writes the agent and prints packages + required env', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'x', '--out', dir])
    expect(out).toContain('Added')
    expect(out).toContain('@agentskit/runtime')
    expect(out).toContain('OPENAI_API_KEY')
  })

  it('add --run executes the agent via the demo provider', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'x', '--out', dir, '--run', 'do it', '--provider', 'demo'])
    expect(out).toContain('Running')
    expect(out.toLowerCase()).toContain('demo')
  })

  it('diff reports up to date right after add', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'x', '--out', dir])
    out = ''
    await cli().parseAsync(['node', 'cli', 'diff', 'x', '--out', dir])
    expect(out).toContain('up to date')
  })

  it('update reports already up to date when unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'x', '--out', dir])
    out = ''
    await cli().parseAsync(['node', 'cli', 'update', 'x', '--out', dir])
    expect(out).toContain('up to date')
  })

  it('add --run on a tool-composing agent prints "not supported"', async () => {
    const toolAgent = {
      ...AGENT,
      skill: null,
      sources: [{ path: 'agent.ts', content: 'import { researcher } from "@agentskit/skills"' }],
    }
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(toolAgent), { status: 200 })) as never
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'x', '--out', dir, '--run', 'do it', '--provider', 'demo'])
    expect(out).toContain('not supported')
  })

  it('add reports failure when the agent cannot be fetched', async () => {
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 404 })) as never
    const dir = mkdtempSync(join(tmpdir(), 'ak-cmd-'))
    await cli().parseAsync(['node', 'cli', 'add', 'missing', '--out', dir])
    expect(out).toContain('add failed')
  })
})
