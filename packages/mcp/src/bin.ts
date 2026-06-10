#!/usr/bin/env node
import type { ToolDefinition } from '@agentskit/core'
import { fetchUrl, webSearch, filesystem, shell, sqliteQueryTool } from '@agentskit/tools'
import { createAgentsKitMcpServer } from './index'

/**
 * `agentskit-mcp` — start an MCP server exposing AgentsKit tools over stdio.
 *
 * Flags:
 *   --tools <a,b,...>   which tools to expose (default: fetch,search)
 *                       available: fetch, search, filesystem, shell, sqlite
 *   --fs-root <dir>     root for the filesystem tool (required to enable it)
 *   --sqlite <file>     database file for the sqlite tool (required to enable it)
 *   --allow-shell       enable the shell tool (off by default — it runs commands)
 *
 * stdout is the MCP JSON-RPC channel; all human output goes to stderr.
 */
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
function has(name: string): boolean {
  return process.argv.includes(name)
}

function buildTools(): ToolDefinition[] {
  const requested = (flag('--tools') ?? 'fetch,search').split(',').map((s) => s.trim())
  const tools: ToolDefinition[] = []
  const warn = (msg: string) => process.stderr.write(`agentskit-mcp: ${msg}\n`)

  if (requested.includes('fetch')) tools.push(fetchUrl())
  if (requested.includes('search')) tools.push(webSearch())
  if (requested.includes('filesystem')) {
    const root = flag('--fs-root')
    if (root) tools.push(...filesystem({ basePath: root }))
    else warn('skipping "filesystem": pass --fs-root <dir> to enable it')
  }
  if (requested.includes('sqlite')) {
    const file = flag('--sqlite')
    if (file) tools.push(sqliteQueryTool({ path: file }))
    else warn('skipping "sqlite": pass --sqlite <file> to enable it')
  }
  if (requested.includes('shell')) {
    if (has('--allow-shell')) tools.push(shell())
    else warn('skipping "shell": pass --allow-shell to enable it (runs commands)')
  }
  return tools
}

const tools = buildTools()
if (tools.length === 0) {
  process.stderr.write('agentskit-mcp: no tools enabled — nothing to serve. See --tools.\n')
  process.exit(1)
}

createAgentsKitMcpServer({
  tools,
  onEvent: (e) => {
    if (e.type === 'error') process.stderr.write(`agentskit-mcp: tool error (${e.tool}): ${e.error}\n`)
  },
})
process.stderr.write(`agentskit-mcp: serving ${tools.length} tool(s) over stdio (${tools.map((t) => t.name).join(', ')})\n`)
