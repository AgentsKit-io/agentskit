import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { createRuntime } from '@agentskit/runtime'
import type { AgentEvent, Observer } from '@agentskit/core'
import { resolveChatProvider } from './providers'
import { resolveTools, resolveSkill, resolveSkills, resolveMemory } from './resolve'
import type { RunCommandOptions } from './run'

interface ToolCallInfo {
  name: string
  status: 'running' | 'done' | 'error'
  durationMs?: number
}

export function RunApp({ task, options }: { task: string; options: RunCommandOptions }) {
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [currentStep, setCurrentStep] = useState(0)
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([])
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [durationMs, setDurationMs] = useState(0)

  useEffect(() => {
    async function execute() {
      if (options.skill && options.skills) {
        setError('--skill and --skills are mutually exclusive.')
        setStatus('error')
        return
      }

      const { adapter } = resolveChatProvider({
        provider: options.provider,
        model: options.model,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
      })

      const tools = resolveTools(options.tools)
      const skill = options.skills
        ? resolveSkills(options.skills)
        : resolveSkill(options.skill)
      const memory = options.memory
        ? resolveMemory(options.memoryBackend, options.memory)
        : undefined

      const observers: Observer[] = [{
        name: 'run-ui',
        on(event: AgentEvent) {
          switch (event.type) {
            case 'agent:step':
              setCurrentStep(event.step)
              break
            case 'tool:start':
              setToolCalls(prev => [...prev, { name: event.name, status: 'running' }])
              break
            case 'tool:end':
              setToolCalls(prev => prev.map(tc =>
                tc.name === event.name && tc.status === 'running'
                  ? { ...tc, status: 'done', durationMs: event.durationMs }
                  : tc
              ))
              break
            case 'error':
              setToolCalls(prev => prev.map(tc =>
                tc.status === 'running' ? { ...tc, status: 'error' } : tc
              ))
              break
          }
        },
      }]

      const runtime = createRuntime({
        adapter,
        tools,
        memory,
        systemPrompt: options.systemPrompt,
        maxSteps: options.maxSteps ? parseInt(options.maxSteps, 10) : undefined,
        observers,
      })

      try {
        const runResult = await runtime.run(task, { skill: skill ?? undefined })
        setResult(runResult.content)
        setDurationMs(runResult.durationMs)
        setStatus('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      }
    }

    void execute()
  }, [])

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">agentskit run</Text>
      <Text dimColor>Task: {task}</Text>

      {status === 'running' && currentStep > 0 && (
        <Text color="yellow">{'⟳'} Step {currentStep}</Text>
      )}

      {toolCalls.map((tc, i) => (
        <Box key={i} marginLeft={2}>
          <Text color={tc.status === 'running' ? 'yellow' : tc.status === 'done' ? 'green' : 'red'}>
            {tc.status === 'running' ? '⟳' : tc.status === 'done' ? '✓' : '✗'}{' '}
            {tc.name}
            {tc.durationMs !== undefined ? ` (${tc.durationMs}ms)` : ''}
          </Text>
        </Box>
      ))}

      {status === 'running' && (
        <Text color="yellow">Running...</Text>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Text color="green" bold>Done ({durationMs}ms)</Text>
          <Text>{result}</Text>
        </Box>
      )}

      {status === 'error' && (
        <Text color="red" bold>Error: {error}</Text>
      )}
    </Box>
  )
}
