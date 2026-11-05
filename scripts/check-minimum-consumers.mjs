#!/usr/bin/env node
/**
 * Minimum-consumer check: installs the `minimum` versions from release-train.json
 * into a scratch directory and proves a small consumer works against them
 * (type-check with the minimum TypeScript + React types, bundle with the minimum
 * tsup, run a test with the minimum vitest, render with the minimum react-dom).
 *
 *   node scripts/check-minimum-consumers.mjs
 *
 * Needs registry access; never touches the workspace install.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../packages/cross-platform/dist/index.js'
import { MINIMUM_CONSUMER_COVERAGE } from './lib/release-train.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'release-train.json'), 'utf8'))
const minimums = {}
for (const group of manifest.groups) for (const [name, entry] of Object.entries(group.packages)) minimums[name] = entry.minimum
const uncovered = Object.keys(minimums).filter((name) => !MINIMUM_CONSUMER_COVERAGE.includes(name))
if (uncovered.length > 0) {
  process.stderr.write(`minimum-consumer check does not cover: ${uncovered.join(', ')}\n`)
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'min-consumer-'))
const run = async (file, args) => {
  const result = await runCommand(file, args, { cwd: dir, maxOutputBytes: 50 * 1024 * 1024 })
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.code !== 0) throw new Error(`${file} ${args.join(' ')} exited with code ${result.code}`)
}
try {
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'min-consumer', private: true, type: 'module', dependencies: minimums }, null, 2))
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2022', lib: ['ES2022', 'DOM'], skipLibCheck: false },
    include: ['src'],
  }))
  writeFileSync(join(dir, 'src', 'app.tsx'), [
    "import { useState } from 'react'",
    "import { renderToString } from 'react-dom/server'",
    'export function Counter({ start }: { start: number }) {',
    '  const [n, setN] = useState(start)',
    '  return <button onClick={() => setN(n + 1)}>{n}</button>',
    '}',
    'export const html = (start: number): string => renderToString(<Counter start={start} />)',
    '',
  ].join('\n'))
  // @types/react-dom is not a manifest package, so declare the one entry point the consumer uses.
  writeFileSync(join(dir, 'src', 'shims.d.ts'), "declare module 'react-dom/server' { export function renderToString(element: unknown): string }\n")
  writeFileSync(join(dir, 'src', 'app.test.tsx'), [
    "import { expect, test } from 'vitest'",
    "import { html } from './app'",
    "test('renders at the minimum versions', () => { expect(html(2)).toContain('2') })",
    '',
  ].join('\n'))
  await run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--save-exact'])
  await run('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json'])
  await run('npx', ['--no-install', 'tsup', 'src/app.tsx', '--format', 'esm', '--external', 'react', '--external', 'react-dom'])
  await run('npx', ['--no-install', 'vitest', 'run'])
  process.stdout.write('minimum-consumer: all manifest minimums verified\n')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
