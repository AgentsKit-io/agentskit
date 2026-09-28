import { describe, expect, it, vi } from 'vitest'
import { shellCommand } from '../src/process/resolve'
import { runShell } from '../src/process/run'
import { spawnShell } from '../src/process/spawn'
import { spawnNodeChild } from '../src/process/node-child'

const node = process.execPath

describe('shellCommand', () => {
  it('uses sh -c on POSIX', () => {
    expect(shellCommand('echo "$HOME" | wc -c', {}, false)).toEqual({
      command: '/bin/sh',
      args: ['-c', 'echo "$HOME" | wc -c'],
      windowsVerbatimArguments: false,
      found: true,
    })
  })

  it('uses %ComSpec% /d /s /c with the line verbatim on Windows', () => {
    expect(shellCommand('echo a & echo b', { ComSpec: 'C:\\Windows\\system32\\cmd.exe' }, true)).toEqual({
      command: 'C:\\Windows\\system32\\cmd.exe',
      args: ['/d', '/s', '/c', '"echo a & echo b"'],
      windowsVerbatimArguments: true,
      found: true,
    })
    expect(shellCommand('dir', {}, true).command).toBe('cmd.exe')
  })
})

describe.skipIf(process.platform === 'win32')('runShell on POSIX', () => {
  it('runs shell syntax and feeds stdin', async () => {
    const result = await runShell('read line; printf "%s|%s" "$line" "$(echo ok)"', { input: 'hello\n' })
    expect(result).toMatchObject({ code: 0, stdout: 'hello|ok', timedOut: false })
  })

  it('reports non-zero exits as results', async () => {
    expect((await runShell('exit 3')).code).toBe(3)
  })

  it('kills the whole shell tree on timeout', async () => {
    const started = Date.now()
    const result = await runShell('sleep 10 && echo late', { timeoutMs: 100, killGraceMs: 0 })
    expect(result.timedOut).toBe(true)
    expect(result.stdout).toBe('')
    expect(Date.now() - started).toBeLessThan(5000)
  })

  it('flags truncated output', async () => {
    const result = await runShell('yes', { maxOutputBytes: 1024 })
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(1024)
  })

  it('rejects invalid options', async () => {
    await expect(runShell('true', { maxOutputBytes: 0 })).rejects.toThrow(/maxOutputBytes/)
    expect(() => spawnShell('  ')).toThrow(/empty/)
  })
})

describe.runIf(process.platform === 'win32')('runShell on Windows', () => {
  it('runs cmd.exe syntax', async () => {
    const result = await runShell('echo a& echo b')
    expect(result.stdout.split(/\r?\n/).filter(Boolean)).toEqual(['a', 'b'])
  })
})

describe('spawnNodeChild', () => {
  it('returns a Node child process with piped streams', async () => {
    const child = spawnNodeChild(node, ['-e', 'process.stdin.pipe(process.stdout)'])
    let out = ''
    child.stdout.on('data', chunk => (out += String(chunk)))
    child.stdin.end('ping')
    const code = await new Promise(resolve => child.once('close', resolve))
    expect(code).toBe(0)
    expect(out).toBe('ping')
  })

  it('resolves bare commands against the child PATH', async () => {
    const child = spawnNodeChild('node', ['-e', 'process.stdout.write("hi")'], {
      env: { ...process.env, PATH: `${node.replace(/[\\/][^\\/]+$/, '')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` },
    })
    let out = ''
    child.stdout.on('data', chunk => (out += String(chunk)))
    await new Promise(resolve => child.once('close', resolve))
    expect(out).toBe('hi')
  })

  it('emits ENOENT for a missing command', async () => {
    const child = spawnNodeChild('definitely-missing-xyz', [], { env: { PATH: '/nowhere' } })
    const error = await new Promise<NodeJS.ErrnoException>(resolve => child.once('error', resolve))
    expect(error.code).toBe('ENOENT')
  })
})

describe('spawnNodeChild on Windows (resolution mocked)', () => {
  it('spawns the resolved cmd.exe line verbatim for .cmd shims', async () => {
    vi.resetModules()
    const spawn = vi.fn(() => ({}))
    vi.doMock('node:child_process', () => ({ spawn }))
    vi.doMock('../src/runtime', async importOriginal => ({ ...(await importOriginal<object>()), isWindows: true }))
    vi.doMock('../src/process/resolve', () => ({
      resolveCommand: () => ({ command: 'C:\\Windows\\system32\\cmd.exe', args: ['/d', '/s', '/c', '"x"'], windowsVerbatimArguments: true, found: true }),
    }))
    const { spawnNodeChild: spawnWindows } = await import('../src/process/node-child')
    spawnWindows('npx', ['tool'], { cwd: 'C:\\repo', stdio: 'pipe' })
    expect(spawn).toHaveBeenCalledWith('C:\\Windows\\system32\\cmd.exe', ['/d', '/s', '/c', '"x"'], {
      windowsHide: true,
      cwd: 'C:\\repo',
      stdio: 'pipe',
      shell: false,
      windowsVerbatimArguments: true,
    })
    vi.doUnmock('node:child_process')
    vi.doUnmock('../src/runtime')
    vi.doUnmock('../src/process/resolve')
  })
})
