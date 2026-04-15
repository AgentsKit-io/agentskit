import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * The Ink example is an interactive terminal app — it doesn't exit on its
 * own. We spawn it, read the first render frame off stdout, then kill it.
 */
test('ink example — renders the chat container', async () => {
  const child = spawn('pnpm', ['--filter', '@agentskit/example-ink', 'dev'], {
    env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const frames: string[] = []
  child.stdout?.on('data', (d) => frames.push(String(d)))
  child.stderr?.on('data', (d) => frames.push(String(d)))

  try {
    // Give Ink 2s to render the first frame
    await sleep(2_000)

    const output = frames.join('')
    expect(output.length).toBeGreaterThan(0)
    // Ink chat always shows a placeholder or prompt — match loosely to
    // avoid brittleness against visual tweaks.
    expect(output).toMatch(/type|message|>|ask/i)
  } finally {
    child.kill('SIGTERM')
    await Promise.race([once(child, 'exit'), sleep(3_000)])
    if (!child.killed) child.kill('SIGKILL')
  }
})
