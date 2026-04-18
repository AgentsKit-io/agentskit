import React, { useMemo, useState } from 'react'
import { Box, Text } from 'ink'
import {
  ChatContainer,
  InputBar,
  Message,
  StatusHeader,
  ThinkingIndicator,
  ToolCallView,
  ToolConfirmation,
  useChat,
} from '@agentskit/ink'
import type { Message as ChatMessage, SkillDefinition, ToolCall, ToolDefinition } from '@agentskit/core'
import { resolveChatProvider } from '../providers'
import {
  builtinSlashCommands,
  createSlashRegistry,
  parseSlashCommand,
  type FeedbackKind,
  type SlashCommand,
  type SlashCommandContext,
} from '../slash-commands'
import type { AgentsKitConfig } from '../config'
import { useRuntime } from '../runtime/use-runtime'
import { useToolPermissions } from '../runtime/use-tool-permissions'
import { useSessionMeta } from '../runtime/use-session-meta'
import { HookDispatcher } from '../extensibility/hooks'
import type { HookHandler } from '../extensibility/plugins'
import { useEffect } from 'react'

export interface ChatCommandOptions {
  provider: string
  model?: string
  system?: string
  memoryPath?: string
  sessionId?: string
  apiKey?: string
  baseUrl?: string
  tools?: string
  skill?: string
  memoryBackend?: string
  agentsKitConfig?: AgentsKitConfig
  /**
   * Extra slash commands appended to the built-ins. Later entries with
   * the same name override earlier ones, so consumers can replace a
   * built-in by re-registering its name.
   */
  slashCommands?: SlashCommand[]
  /** Extra tools contributed by plugins — merged into the resolved tool set. */
  extraTools?: ToolDefinition[]
  /** Extra skills contributed by plugins — merged into the resolved skill set. */
  extraSkills?: SkillDefinition[]
  /** Hook handlers — from plugins + config. Fire on lifecycle events. */
  hookHandlers?: HookHandler[]
  /** Permission policy for tool calls. */
  permissionPolicy?: import('../extensibility/permissions').PermissionPolicy
}

function groupIntoTurns(messages: ChatMessage[]): ChatMessage[][] {
  const turns: ChatMessage[][] = []
  let current: ChatMessage[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      if (current.length > 0) turns.push(current)
      current = [message]
    } else if (message.role === 'system') {
      if (current.length > 0) turns.push(current)
      turns.push([message])
      current = []
    } else {
      current.push(message)
    }
  }
  if (current.length > 0) turns.push(current)
  return turns
}

export function ChatApp(options: ChatCommandOptions) {
  const {
    runtime,
    memory,
    tools,
    skills,
    state: { baseUrl, toolsFlag, skillFlag },
    setProvider,
    setModel,
    setApiKey,
    setBaseUrl,
    setToolsFlag,
    setSkillFlag,
  } = useRuntime(options)

  const mergedTools = useMemo(() => {
    const extra = options.extraTools ?? []
    return [...tools, ...extra]
  }, [tools, options.extraTools])

  const mergedSkills = useMemo(() => {
    const extra = options.extraSkills ?? []
    if (!skills && extra.length === 0) return undefined
    return [...(skills ?? []), ...extra]
  }, [skills, options.extraSkills])

  const chat = useChat({
    adapter: runtime.adapter,
    memory,
    systemPrompt: options.system,
    tools: mergedTools.length > 0 ? mergedTools : undefined,
    skills: mergedSkills,
  })

  const { sessionAllowed, handleApproveAlways, awaitingConfirmation } = useToolPermissions(chat)

  useSessionMeta({
    sessionId: options.sessionId,
    messages: chat.messages,
    provider: runtime.provider,
    model: runtime.model,
  })

  const turns = useMemo(() => groupIntoTurns(chat.messages), [chat.messages])
  const toolNames = toolsFlag ? toolsFlag.split(',').map(s => s.trim()).filter(Boolean) : []

  const [feedback, setFeedback] = useState<{ message: string; kind: FeedbackKind } | null>(null)

  const hookDispatcher = useMemo(
    () => new HookDispatcher(options.hookHandlers ?? []),
    [options.hookHandlers],
  )

  useEffect(() => {
    void hookDispatcher.dispatch('SessionStart', {
      event: 'SessionStart',
      sessionId: options.sessionId,
      provider: runtime.provider,
      model: runtime.model,
    })
    return () => {
      void hookDispatcher.dispatch('SessionEnd', {
        event: 'SessionEnd',
        sessionId: options.sessionId,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookDispatcher])

  const slashCommands = useMemo<SlashCommand[]>(
    () => [...builtinSlashCommands, ...(options.slashCommands ?? [])],
    [options.slashCommands],
  )
  const slashRegistry = useMemo(() => createSlashRegistry(slashCommands), [slashCommands])

  const handleSubmitInput = async (raw: string): Promise<boolean> => {
    const parsed = parseSlashCommand(raw)
    if (!parsed) {
      const hookResult = await hookDispatcher.dispatch('UserPromptSubmit', {
        event: 'UserPromptSubmit',
        prompt: raw,
      })
      if (hookResult.blocked) {
        setFeedback({
          message: `Prompt blocked: ${hookResult.reason ?? 'hook refused'}`,
          kind: 'warn',
        })
        return true
      }
      setFeedback(null)
      return false
    }
    const cmd = slashRegistry.get(parsed.name)
    if (!cmd) {
      setFeedback({
        message: `Unknown command: /${parsed.name}. Type /help for the list.`,
        kind: 'error',
      })
      return true
    }
    const ctx: SlashCommandContext = {
      chat,
      runtime: {
        provider: runtime.provider,
        model: runtime.model,
        mode: runtime.mode,
        baseUrl,
        tools: toolsFlag,
        skill: skillFlag,
        sessionId: options.sessionId,
      },
      setProvider,
      setModel,
      setApiKey,
      setBaseUrl,
      setTools: setToolsFlag,
      setSkill: setSkillFlag,
      feedback: (message, kind = 'info') => setFeedback({ message, kind }),
      commands: slashCommands,
    }
    try {
      await cmd.run(ctx, parsed.args)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setFeedback({ message: `/${parsed.name} failed: ${message}`, kind: 'error' })
    }
    return true
  }

  return (
    <Box flexDirection="column" gap={1}>
      <StatusHeader
        provider={runtime.provider}
        model={runtime.model}
        mode={runtime.mode}
        tools={toolNames}
        messageCount={chat.messages.length}
        sessionId={options.sessionId}
      />

      <ChatContainer>
        {turns.map((turn, turnIdx) => {
          const assistantSteps = turn.filter(m => m.role === 'assistant').length
          let stepIndex = 0
          return (
            <Box key={`turn-${turnIdx}`} flexDirection="column" gap={1}>
              {turn.map(message => {
                const showStep = message.role === 'assistant' && assistantSteps > 1
                if (showStep) stepIndex++
                return (
                  <Box key={message.id} flexDirection="column">
                    {showStep ? (
                      <Text dimColor>↻ step {stepIndex}/{assistantSteps}</Text>
                    ) : null}
                    <Message message={message} />
                    {message.toolCalls?.map((toolCall: ToolCall) => (
                      <Box key={toolCall.id} flexDirection="column">
                        <ToolCallView toolCall={toolCall} expanded />
                        {toolCall.status === 'requires_confirmation' &&
                        !sessionAllowed.has(toolCall.name) ? (
                          <ToolConfirmation
                            toolCall={toolCall}
                            onApprove={chat.approve}
                            onDeny={chat.deny}
                            onApproveAlways={handleApproveAlways}
                          />
                        ) : null}
                      </Box>
                    ))}
                  </Box>
                )
              })}
            </Box>
          )
        })}
      </ChatContainer>

      <ThinkingIndicator
        visible={chat.status === 'streaming'}
        label={toolNames.length > 0 ? 'agent working' : 'thinking'}
      />

      {chat.error ? (
        <Box borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
          <Text color="red" bold>✗ {chat.error.name || 'Error'}</Text>
          <Text color="red">{chat.error.message}</Text>
        </Box>
      ) : null}

      {feedback ? (
        <Box borderStyle="round" borderColor={feedbackBorder(feedback.kind)} paddingX={1}>
          <Text color={feedbackBorder(feedback.kind)}>{feedback.message}</Text>
        </Box>
      ) : null}

      <InputBar
        chat={chat}
        placeholder="Type a message or /help for commands"
        disabled={awaitingConfirmation}
        onSubmitInput={handleSubmitInput}
      />
    </Box>
  )
}

function feedbackBorder(kind: FeedbackKind): string {
  switch (kind) {
    case 'error':
      return 'red'
    case 'warn':
      return 'yellow'
    case 'success':
      return 'green'
    case 'info':
    default:
      return 'cyan'
  }
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
