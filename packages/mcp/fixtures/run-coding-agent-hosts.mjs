import { spawn } from 'node:child_process'
import { createMcpClient, createStdioTransport } from '@agentskit/tools/mcp'

const child = spawn(process.execPath, ['packages/mcp/dist/bin.js', '--tools', 'fetch,search'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
})
const transport = createStdioTransport(child)
const client = createMcpClient({ transport })

try {
  const initialized = await client.initialize()
  const listed = await client.listTools()
  const toolNames = listed.tools.map(tool => tool.name).sort()
  if (
    initialized.serverInfo.name === 'agentskit-mcp'
    && toolNames.join(',') === 'fetch_url,web_search'
  ) {
    process.stdout.write('verified local MCP stdio protocol; cli tools: fetch_url, web_search\n')
  } else {
    process.exitCode = 1
  }
} finally {
  await client.close()
}
