import { execFileSync } from 'node:child_process'

if (process.env.TURBO_HASH) {
  console.log('docs: dependencies provided by Turbo')
  process.exit(0)
}

execFileSync('pnpm', [
  '--filter', '@agentskit/adapters',
  '--filter', '@agentskit/eval',
  '--filter', '@agentskit/memory',
  '--filter', '@agentskit/observability',
  '--filter', '@agentskit/rag',
  '--filter', '@agentskit/runtime',
  '--filter', '@agentskit/sandbox',
  '--filter', '@agentskit/skills',
  'build',
], { stdio: 'inherit' })
