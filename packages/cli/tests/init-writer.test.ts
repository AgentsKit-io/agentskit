import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { writeStarterProject } from '../src/init-writer'
import type { StarterKind } from '../src/init'

describe('init writer', () => {
  it('aligns generated package versions before writing', async () => {
    const targetDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-init-writer-'))
    const render = () => ({ 'package.json': JSON.stringify({ dependencies: { '@agentskit/react': '0.0.0' } }) })
    const renderers = Object.fromEntries((['react', 'nextjs', 'ink', 'runtime', 'multi-agent', 'sveltekit', 'nuxt', 'vite-ink', 'cloudflare-workers', 'bun', 'expo', 'deno-deploy', 'angular'] as StarterKind[]).map(kind => [kind, render])) as Record<StarterKind, typeof render>
    await writeStarterProject({ targetDir, template: 'react' }, renderers)
    expect(await readFile(path.join(targetDir, 'package.json'), 'utf8')).toContain('^0.8.3')
  })
})
