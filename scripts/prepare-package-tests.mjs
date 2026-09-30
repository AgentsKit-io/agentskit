import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Turbo test tasks already depend on this package's build and dependency builds.
if (!process.env.TURBO_HASH) {
  const { name } = JSON.parse(readFileSync('package.json', 'utf8'))
  const build = spawnSync('pnpm', [
    'exec', 'turbo', 'run', 'build', `--filter=${name}`, '--concurrency=2',
  ], { stdio: 'inherit' })
  process.exit(build.status ?? 1)
}
