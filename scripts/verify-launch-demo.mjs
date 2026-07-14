#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { REPO_ROOT } from './compute-stats.mjs'

const demoId = process.argv[2]
const launch = JSON.parse(readFileSync(join(REPO_ROOT, 'docs/ecosystem/launch/launch-package.json'), 'utf8'))
const ecosystem = JSON.parse(readFileSync(join(REPO_ROOT, 'ecosystem.json'), 'utf8'))
const demo = launch.demos.find((entry) => entry.id === demoId)
assert.ok(demo, `Unknown launch demo: ${demoId ?? '<missing>'}`)
assert.equal(demo.commands.length, 3)

if (demoId === 'first-agent') {
  const build = spawnSync('pnpm', ['--filter', '@agentskit/runtime...', 'build'], { cwd: REPO_ROOT, encoding: 'utf8' })
  assert.equal(build.status, 0, build.stderr)
  const run = spawnSync('pnpm', ['--filter', '@agentskit/docs-next', 'exec', 'tsx', 'fixtures/first-agent/agent.ts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /Agent ready\. I received: Plan my first production agent/)
} else if (demoId === 'registry-start') {
  const product = ecosystem.products.find((entry) => entry.id === 'registry')
  assert.equal(product?.surfaces?.llms, 'https://registry.agentskit.io/llms.txt')
  assert.ok(readFileSync(join(REPO_ROOT, 'packages/cli/src/commands/add.ts'), 'utf8').includes('registry'))
  assert.ok(demo.commands.some((command) => command === 'npx agentskit add research'))
} else if (demoId === 'playbook-discipline') {
  const product = ecosystem.products.find((entry) => entry.id === 'playbook')
  assert.equal(product?.surfaces?.llms, 'https://playbook.agentskit.io/llms.txt')
  for (const command of demo.commands) {
    const rawUrl = command.match(/https:\/\/[^\s|]+/)?.[0]
    assert.ok(rawUrl, `Playbook command has no HTTPS URL: ${command}`)
    const url = new URL(rawUrl)
    assert.equal(url.protocol, 'https:')
    assert.equal(url.hostname, 'playbook.agentskit.io')
  }
} else {
  assert.fail(`Launch demo has no verifier: ${demoId}`)
}

process.stdout.write(`verified:${demoId}\n`)
