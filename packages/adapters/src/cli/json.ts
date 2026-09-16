import { AdapterError, ErrorCodes, type StreamChunk } from '@agentskit/core'

export const cliError = (message: string, cause?: unknown): AdapterError => new AdapterError({ code: ErrorCodes.AK_ADAPTER_STREAM_FAILED, message, cause })

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCliJsonResponse(value: unknown): readonly StreamChunk[] {
  if (!isRecord(value)) throw cliError('CLI JSON response must be an object')
  const chunks: StreamChunk[] = []
  if (typeof value.text === 'string') chunks.push({ type: 'text', content: value.text })
  if (typeof value.reasoning === 'string') chunks.push({ type: 'reasoning', content: value.reasoning })
  if (Array.isArray(value.toolCalls)) {
    for (const item of value.toolCalls) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.args !== 'string') {
        throw cliError('CLI JSON toolCalls must contain string id, name, and args fields')
      }
      JSON.parse(item.args)
      chunks.push({ type: 'tool_call', toolCall: { id: item.id, name: item.name, args: item.args } })
    }
  }
  if (value.usage !== undefined) {
    if (!isRecord(value.usage)) {
      throw cliError('CLI JSON usage must contain numeric promptTokens, completionTokens, and totalTokens')
    }
    const promptTokens = value.usage.promptTokens
    const completionTokens = value.usage.completionTokens
    const totalTokens = value.usage.totalTokens
    if (typeof promptTokens !== 'number' || typeof completionTokens !== 'number' || typeof totalTokens !== 'number') {
      throw cliError('CLI JSON usage must contain numeric promptTokens, completionTokens, and totalTokens')
    }
    chunks.push({ type: 'usage', usage: { promptTokens, completionTokens, totalTokens } })
  }
  if (value.metadata !== undefined) {
    if (!isRecord(value.metadata)) throw cliError('CLI JSON metadata must be an object')
    if (chunks.length === 0) throw cliError('CLI JSON response contains no semantic output')
    chunks[chunks.length - 1] = { ...chunks[chunks.length - 1], metadata: value.metadata }
  }
  if (chunks.length === 0) throw cliError('CLI JSON response contains no semantic output')
  return chunks
}

