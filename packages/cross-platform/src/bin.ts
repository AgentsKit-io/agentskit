#!/usr/bin/env node
import { runCli } from './lint/cli'

runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  log: line => process.stdout.write(`${line}\n`),
  error: line => process.stderr.write(`${line}\n`),
}).then(
  code => {
    process.exitCode = code
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  },
)
