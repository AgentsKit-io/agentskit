#!/usr/bin/env node
/** CI gate: no new hand-rolled HTTP patterns (ADR-0037). */

import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runCli } from '../packages/cross-platform/dist/index.js'
import { NET_RULES } from '../packages/net/dist/rules.js'

const require = createRequire(import.meta.url)
const cjs = require('../packages/net/dist/rules.cjs')
const cjsRules = cjs.NET_RULES
const esmIds = NET_RULES.map(rule => rule.id)
const cjsIds = Array.isArray(cjsRules) ? cjsRules.map(rule => rule.id) : []

if (esmIds.length !== 6 || cjsIds.join() !== esmIds.join() || cjs.default !== undefined) {
  console.error('ESM/CJS NET_RULES exports must contain the same six rule ids.')
  process.exitCode = 1
} else {
  const args = process.argv.slice(2)
  const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
  const baseline = value('--baseline') ?? '.net-rules-baseline.json'
  if (args.includes('--allow-increase') || (args.includes('--init') && existsSync(resolve(baseline)))) {
    console.error(args.includes('--allow-increase')
      ? 'NET baseline increases are not allowed.'
      : `Refusing to replace existing baseline: ${baseline}`)
    process.exitCode = 1
  } else {
    const argv = ['check', ...(args.includes('--baseline') ? [] : ['--baseline', baseline]),
      ...(args.includes('--include') ? [] : ['--include', 'packages,scripts,apps,tests,e2e']),
      ...(args.includes('--exclude') ? [] : ['--exclude', 'packages/net/']), ...args]
    process.exitCode = await runCli(argv, {
      cwd: process.cwd(),
      log: line => process.stdout.write(`${line}\n`),
      error: line => process.stderr.write(`${line}\n`),
    }, { rules: NET_RULES })
  }
}
