import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Command } from 'commander'
import { registerFlowCommand } from '../src/commands/flow'

describe('agentskit flow', () => {
  let dir: string
  let stdout: string
  let stderr: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let outSpy: ReturnType<typeof vi.spyOn>
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-flow-'))
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

  it('validate reports ok on a linear DAG', async () => {
    const file = join(dir, 'flow.yaml')
    writeFileSync(file, `name: demo\nnodes:\n  - id: a\n    run: noop\n  - id: b\n    run: noop\n    needs: [a]\n`)
    await buildProgram().parseAsync(['node', 'agentskit', 'flow', 'validate', file])
    expect(stdout).toContain('flow "demo" ok')
    expect(stdout).toContain('a → b')
  })

  it('validate fails on cycle', async () => {
    const file = join(dir, 'cycle.yaml')
    writeFileSync(file, `name: bad\nnodes:\n  - id: a\n    run: noop\n    needs: [b]\n  - id: b\n    run: noop\n    needs: [a]\n`)
    await expect(
      buildProgram().parseAsync(['node', 'agentskit', 'flow', 'validate', file]),
    ).rejects.toThrow(/exit:1/)
    expect(stderr).toContain('cycle')
  })

  it('render emits mermaid', async () => {
    const file = join(dir, 'flow.yaml')
    writeFileSync(file, `name: demo\nnodes:\n  - id: a\n    run: noop\n  - id: b\n    run: noop\n    needs: [a]\n`)
    await buildProgram().parseAsync(['node', 'agentskit', 'flow', 'render', file])
    expect(stdout).toContain('flowchart TD')
    expect(stdout).toContain('a --> b')
  })

  it('run executes via registry', async () => {
    const file = join(dir, 'flow.yaml')
    writeFileSync(file, `name: demo\nnodes:\n  - id: a\n    run: greet\n    with:\n      who: world\n`)
    const reg = join(dir, 'registry.mjs')
    writeFileSync(reg, `export default { greet: (ctx) => 'hi ' + ctx.with.who }\n`)
    await buildProgram().parseAsync([
      'node', 'agentskit', 'flow', 'run', file, '--registry', reg,
    ])
    expect(stdout).toContain('"a": "hi world"')
  })

  it('rejects flow file missing nodes', async () => {
    const file = join(dir, 'bad.yaml')
    writeFileSync(file, `name: noop\n`)
    await expect(
      buildProgram().parseAsync(['node', 'agentskit', 'flow', 'validate', file]),
    ).rejects.toThrow(/exit:1/)
    expect(stderr).toContain('nodes[]')
  })
})
