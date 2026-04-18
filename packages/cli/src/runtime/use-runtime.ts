import { useMemo, useState } from 'react'
import { resolveChatProvider } from '../providers'
import { resolveMemory, resolveTools, skillRegistry } from '../resolve'

export interface UseRuntimeOptions {
  provider: string
  model?: string
  apiKey?: string
  baseUrl?: string
  tools?: string
  skill?: string
  memoryBackend?: string
  memoryPath?: string
}

export function useRuntime(options: UseRuntimeOptions) {
  const [provider, setProvider] = useState(options.provider)
  const [model, setModel] = useState(options.model)
  const [apiKey, setApiKey] = useState(options.apiKey)
  const [baseUrl, setBaseUrl] = useState(options.baseUrl)
  const [toolsFlag, setToolsFlag] = useState<string | undefined>(options.tools)
  const [skillFlag, setSkillFlag] = useState<string | undefined>(options.skill)

  const runtime = useMemo(
    () => resolveChatProvider({ provider, model, apiKey, baseUrl }),
    [provider, model, apiKey, baseUrl],
  )

  const memory = useMemo(
    () => resolveMemory(options.memoryBackend, options.memoryPath ?? '.agentskit-history.json'),
    [options.memoryPath, options.memoryBackend],
  )

  const tools = useMemo(() => resolveTools(toolsFlag), [toolsFlag])

  const skills = useMemo(() => {
    if (!skillFlag) return undefined
    const names = skillFlag.split(',').map(s => s.trim())
    const resolved = names.map(n => skillRegistry[n]).filter(Boolean)
    if (resolved.length === 0) return undefined
    return resolved
  }, [skillFlag])

  return {
    runtime,
    memory,
    tools,
    skills,
    state: { provider, model, apiKey, baseUrl, toolsFlag, skillFlag },
    setProvider,
    setModel,
    setApiKey,
    setBaseUrl,
    setToolsFlag,
    setSkillFlag,
  }
}
