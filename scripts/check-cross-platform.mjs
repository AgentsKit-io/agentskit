#!/usr/bin/env node
/**
 * CI gate: no new Windows/runtime portability hazards (ADR-0036).
 *
 * Runs the @agentskit/cross-platform guardrail against the ratchet baseline in
 * `.cross-platform-baseline.json`: existing findings are recorded, new ones
 * fail, and counts may only go down. After migrating code, tighten with:
 *   node scripts/check-cross-platform.mjs --update
 * Requires `pnpm --filter @agentskit/cross-platform build`.
 */

import { runCli } from '../packages/cross-platform/dist/index.js'

process.exitCode = await runCli(['check', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  log: line => process.stdout.write(`${line}\n`),
  error: line => process.stderr.write(`${line}\n`),
})
