#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const target = mkdtempSync(join(tmpdir(), 'agentskit-registry-install-'))
const output = join(target, 'agents')
const command = 'npx @agentskit/cli add research'

try {
  const result = spawnSync('npx', ['--yes', '@agentskit/cli', 'add', 'research', '--out', output], {
    cwd: target,
    encoding: 'utf8',
    timeout: 120_000,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const sourcePath = join(output, 'research/agent.ts')
  const readmePath = join(output, 'research/README.md')
  assert.ok(existsSync(sourcePath), `${command} must install the agent factory source`)
  assert.ok(existsSync(readmePath), `${command} must install its usage README`)
  assert.match(readFileSync(sourcePath, 'utf8'), /export function createResearchAgent/)
  const publicRoots = [join(root, 'apps/registry/app'), join(root, 'apps/registry/content'), join(root, 'apps/registry/public')]
  const staleCommands = []
  const inspect = (path) => {
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path)) inspect(join(path, name))
    } else if (!path.endsWith('.map') && /\.(?:[cm]?[jt]sx?|mdx?)$/.test(path)) {
      if (/npx\s+agentskit\b/.test(readFileSync(path, 'utf8'))) staleCommands.push(path)
    }
  }
  publicRoots.forEach(inspect)
  assert.deepEqual(staleCommands, [], 'Public Registry surfaces must use the scoped CLI package')
  console.log(JSON.stringify({ status: 'passed', criteria: ['registry-install-steps-verified-and-highlighted', 'registry-cli-uses-published-scope'], command, installed: ['agents/research/agent.ts', 'agents/research/README.md'], staleCommands }))
} finally {
  rmSync(target, { recursive: true, force: true })
}
