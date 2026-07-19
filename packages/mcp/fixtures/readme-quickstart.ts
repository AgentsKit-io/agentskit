import { createAgentsKitMcpServer } from '@agentskit/mcp'
import { createInMemoryTransportPair } from '@agentskit/tools/mcp'

const [, transport] = createInMemoryTransportPair()
const server = createAgentsKitMcpServer({ tools: [], transport })
await server.close()
