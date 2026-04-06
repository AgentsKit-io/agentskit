import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { createFileMemory } from '@agentskit/core'
import type { ChatMemory, ToolDefinition, SkillDefinition } from '@agentskit/core'
import { ChatContainer, InputBar, Message, ThinkingIndicator, ToolCallView, useChat } from '@agentskit/ink'
import { resolveChatProvider } from './providers'
import { webSearch, filesystem, shell } from '@agentskit/tools'
import { researcher, coder, planner, critic, summarizer } from '@agentskit/skills'
import { sqliteChatMemory } from '@agentskit/memory'

const skillRegistry: Record<string, SkillDefinition> = {
  researcher,
  coder,
  planner,
  critic,
  summarizer,
}

function resolveTools(toolNames: string | undefined): ToolDefinition[] {
  if (!toolNames) return []
  const tools: ToolDefinition[] = []
  for (const name of toolNames.split(',').map(s => s.trim())) {
    switch (name) {
      case 'web_search':
        tools.push(webSearch())
        break
      case 'filesystem':
        tools.push(...filesystem({ basePath: process.cwd() }))
        break
      case 'shell':
        tools.push(shell({ timeout: 30_000 }))
        break
      default:
        process.stderr.write(`Unknown tool: ${name}\n`)
    }
  }
  return tools
}

export interface ChatCommandOptions {
  provider: string
  model?: string
  system?: string
  memoryPath?: string
  apiKey?: string
  baseUrl?: string
  tools?: string
  skill?: string
  memoryBackend?: string
}

function resolveMemory(backend: string | undefined, path: string): ChatMemory {
  switch (backend) {
    case 'sqlite':
      return sqliteChatMemory({ path: path.replace(/\.json$/, '.db') })
    case 'file':
    default:
      return createFileMemory(path)
  }
}

export function ChatApp(options: ChatCommandOptions) {
  const adapter = useMemo(
    () => resolveChatProvider(options).adapter,
    [options.apiKey, options.baseUrl, options.model, options.provider]
  )
  const memory = useMemo(
    () => resolveMemory(options.memoryBackend, options.memoryPath ?? '.agentskit-history.json'),
    [options.memoryPath, options.memoryBackend]
  )
  const tools = useMemo(() => resolveTools(options.tools), [options.tools])
  const skills = useMemo(() => {
    if (!options.skill) return undefined
    const names = options.skill.split(',').map(s => s.trim())
    const resolved = names.map(n => skillRegistry[n]).filter(Boolean)
    if (resolved.length === 0) return undefined
    return resolved
  }, [options.skill])

  const chat = useChat({
    adapter,
    memory,
    systemPrompt: options.system,
    tools: tools.length > 0 ? tools : undefined,
    skills,
  })

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        AgentsKit CLI
      </Text>
      <Text dimColor>
        Press Enter to send. Live providers use env vars or --api-key, and demo mode stays available for zero-config usage.
      </Text>
      <ChatContainer>
        {chat.messages.map(message => (
          <Box key={message.id} flexDirection="column" marginBottom={1}>
            <Message message={message} />
            {message.toolCalls?.map(toolCall => (
              <ToolCallView key={toolCall.id} toolCall={toolCall} />
            ))}
          </Box>
        ))}
      </ChatContainer>
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Type a message and press Enter..." />
    </Box>
  )
}

export function renderChatHeader(options: ChatCommandOptions): string {
  const runtime = resolveChatProvider(options)
  const parts = [`provider=${runtime.provider}`]
  if (runtime.model) parts.push(`model=${runtime.model}`)
  parts.push(`mode=${runtime.mode}`)
  if (options.tools) parts.push(`tools=${options.tools}`)
  if (options.skill) parts.push(`skill=${options.skill}`)
  if (options.memoryBackend) parts.push(`memory=${options.memoryBackend}`)
  return parts.join(' ')
}
