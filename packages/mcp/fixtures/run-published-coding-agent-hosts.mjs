import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createMcpClient, createStdioTransport } from '@agentskit/tools/mcp'

const packageSpec = '@agentskit/mcp@0.3.4'
const child = spawn('npx', ['-y', packageSpec, '--tools', 'fetch,search'], {
  cwd: tmpdir(),
  stdio: ['pipe', 'pipe', 'pipe'],
})
let stderr = ''
child.stderr.on('data', chunk => {
  stderr += String(chunk)
})

const transport = createStdioTransport(child)
const client = createMcpClient({ transport })
let timeout

const waitForExit = (timeoutMs) => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    resolve(true)
    return
  }
  const onExit = () => {
    clearTimeout(timer)
    resolve(true)
  }
  const timer = setTimeout(() => {
    child.off('exit', onExit)
    resolve(false)
  }, timeoutMs)
  child.once('exit', onExit)
})

const stopChild = async () => {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill()
  if (await waitForExit(1_000)) return
  child.kill('SIGKILL')
  await waitForExit(1_000)
}

try {
  await Promise.race([
    (async () => {
      const initialized = await client.initialize()
      const listed = await client.listTools()
      const toolNames = listed.tools.map(tool => tool.name).sort()
      if (
        initialized.serverInfo.name !== 'agentskit-mcp'
        || toolNames.join(',') !== 'fetch_url,web_search'
      ) {
        throw new Error(`unexpected published MCP handshake: ${initialized.serverInfo.name}; ${toolNames.join(',')}`)
      }
      process.stdout.write(`verified published ${packageSpec}; cli tools: fetch_url, web_search\n`)
    })(),
    new Promise((_, reject) => {
      child.once('exit', (code, signal) => {
        reject(new Error(`published MCP exited before verification: code=${code}; signal=${signal}`))
      })
    }),
    new Promise((_, reject) => {
      child.once('error', error => reject(error))
    }),
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('published MCP verification timed out after 30s')), 30_000)
    }),
  ])
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${stderr}`)
  process.exitCode = 1
} finally {
  clearTimeout(timeout)
  await stopChild()
  await Promise.race([
    client.close().catch(() => undefined),
    new Promise(resolve => setTimeout(resolve, 1_000)),
  ])
}
