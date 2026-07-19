#!/usr/bin/env node
import { runMcpCli } from './cli'

const warn = (message: string): void => {
  process.stderr.write(`agentskit-mcp: ${message}\n`)
}

void runMcpCli(process.argv.slice(2), { warn }).then((result) => {
  process.exitCode = result.exitCode
}).catch(() => {
  warn('unexpected startup failure')
  process.exitCode = 1
})
