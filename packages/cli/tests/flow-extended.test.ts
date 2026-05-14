/**
 * Extended flow command tests — covers:
 * - flow render error path (line 87)
 * - flow run --verbose (line 119)
 * - flow run error path (lines 130-131)
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Command } from 'commander'
import { registerFlowCommand } from '../src/commands/flow'

describe('agentskit flow — extended', () => {
  let dir: string
  let stdout: string
  let stderr: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let outSpy: ReturnType<typeof vi.spyOn>
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-flow-ext-'))
    stdout = ''
    stderr = ''
    outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string) => {
      stdout += chunk
      return true
    }) as never)
    errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string) => {
      stderr += chunk
      return true
    }) as never)
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`)
    }) as never)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    outSpy.mockRestore()
    errSpy.mockRestore()
    exitSpy.mockRestore()
  })

  function buildProgram(): Command {
    const program = new Command()
    program.exitOverride()
    registerFlowCommand(program)
    return program
  }

  it('render exits 1 on bad flow file', async () => {
    await expect(
      buildProgram().parseAsync(['node', 'agentskit', 'flow', 'render', join(dir, 'nonexistent.yaml')]),
    ).rejects.toThrow(/exit:1/)
    expect(stderr).toContain('Error')
  })

  it('run --verbose streams node events to stderr', async () => {
    const file = join(dir, 'flow.yaml')
    writeFileSync(file, `name: demo\nnodes:\n  - id: a\n    run: greet\n    with:\n      who: verbose\n`)
    const reg = join(dir, 'registry.mjs')
    writeFileSync(reg, `export default { greet: (ctx) => 'hi ' + ctx.with.who }\n`)

    await buildProgram().parseAsync([
      'node', 'agentskit', 'flow', 'run', file,
      '--registry', reg,
      '--verbose',
    ])

    expect(stderr.length).toBeGreaterThan(0)
    // stderr should contain JSON event lines
    const lines = stderr.trim().split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThan(0)
    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('run exits 1 on bad registry', async () => {
    const file = join(dir, 'flow.yaml')
    writeFileSync(file, `name: demo\nnodes:\n  - id: a\n    run: noop\n`)

    await expect(
      buildProgram().parseAsync([
        'node', 'agentskit', 'flow', 'run', file,
        '--registry', join(dir, 'nonexistent-registry.mjs'),
      ]),
    ).rejects.toThrow(/exit:1/)
    expect(stderr).toContain('Error')
  })
})
