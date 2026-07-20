const HOSTED = 'https://registry.agentskit.io/r'
const RAW = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main'
const REGISTRY_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export interface FetchedAgentSkill {
  id: string
  description: string
  systemPrompt: string
}

export interface FetchAgentSkillOptions {
  /** Per-request timeout. Default 10000 ms. */
  timeoutMs?: number
  /** Maximum UTF-8 response bytes. Default 131072. */
  maxResponseBytes?: number
  signal?: AbortSignal
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input)

const boundedString = (input: unknown, maximum: number): string | null => {
  if (typeof input !== 'string' || input.trim().length === 0) return null
  return new TextEncoder().encode(input).byteLength <= maximum ? input.trim() : null
}

const readBounded = async (response: Response, maximum: number): Promise<string | null> => {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximum) return null
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    bytes += chunk.value.byteLength
    if (bytes > maximum) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    text += decoder.decode(chunk.value, { stream: true })
  }
  return text + decoder.decode()
}

const requestText = async (
  url: string,
  fetchImpl: typeof fetch,
  options: Required<Pick<FetchAgentSkillOptions, 'maxResponseBytes' | 'timeoutMs'>> &
    Pick<FetchAgentSkillOptions, 'signal'>,
): Promise<string | null> => {
  if (options.signal?.aborted) return null
  const controller = new AbortController()
  let resolveAbort: ((value: null) => void) | undefined
  const aborted = new Promise<null>((resolve) => {
    resolveAbort = resolve
  })
  const abort = (): void => {
    controller.abort()
    resolveAbort?.(null)
  }
  options.signal?.addEventListener('abort', abort, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const request = (async (): Promise<string | null> => {
      const response = await fetchImpl(url, { signal: controller.signal })
      if (!response.ok) return null
      return readBounded(response, options.maxResponseBytes)
    })().catch(() => null)
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve(null)
      }, options.timeoutMs)
    })
    return await Promise.race([request, timeout, aborted])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

const requestJson = async (
  url: string,
  fetchImpl: typeof fetch,
  options: Required<Pick<FetchAgentSkillOptions, 'maxResponseBytes' | 'timeoutMs'>> &
    Pick<FetchAgentSkillOptions, 'signal'>,
): Promise<unknown | null> => {
  const text = await requestText(url, fetchImpl, options)
  if (text === null) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export async function fetchAgentSkill(
  id: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  options: FetchAgentSkillOptions = {},
): Promise<FetchedAgentSkill | null> {
  if (!REGISTRY_ID.test(id) || typeof fetchImpl !== 'function') return null
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxResponseBytes = options.maxResponseBytes ?? 131_072
  if (
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000 ||
    !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 1_048_576
  ) return null
  const bounds = { maxResponseBytes, signal: options.signal, timeoutMs }

  const hosted = await requestJson(`${HOSTED}/${id}.json`, fetchImpl, bounds)
  if (isRecord(hosted)) {
    if (hosted.skill === null) return null
    if (isRecord(hosted.skill)) {
      const systemPrompt = boundedString(hosted.skill.systemPrompt, 65_536)
      if (systemPrompt) {
        const description = boundedString(hosted.description, 4096) ?? id
        return Object.freeze({ description, id, systemPrompt })
      }
    }
  }

  const meta = await requestJson(`${RAW}/registry/${id}/meta.json`, fetchImpl, bounds)
  if (!isRecord(meta)) return null
  const source = await requestText(`${RAW}/registry/${id}/agent.ts`, fetchImpl, bounds)
  if (!source) return null
  const match = source.match(/systemPrompt:\s*`((?:\\.|[^`\\])*)`/)
  if (!match) return null
  const systemPrompt = boundedString(
    match[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${'),
    65_536,
  )
  if (!systemPrompt) return null
  return Object.freeze({
    id,
    description: boundedString(meta.description, 4096) ?? id,
    systemPrompt,
  })
}
