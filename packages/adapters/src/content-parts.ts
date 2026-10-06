import type { ContentPart, Message } from '@agentskit/core'

type Provider = 'openai' | 'anthropic' | 'gemini' | 'ollama'

/** A modality or source representation that the selected adapter cannot send. */
export class CapabilityUnsupportedError extends Error {
  readonly code = 'CAPABILITY_UNSUPPORTED'
  constructor(readonly provider: string, readonly partType: ContentPart['type']) {
    super(`${provider} cannot send this ${partType} part`)
    this.name = 'CapabilityUnsupportedError'
  }
}

function unsupported(provider: Provider, part: ContentPart): never {
  throw new CapabilityUnsupportedError(provider, part.type)
}

function dataSource(part: Exclude<ContentPart, { type: 'text' }>, provider: Provider) {
  if (!part.source.startsWith('data:')) return undefined
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(part.source)
  if (!match || match[2]!.length % 4 !== 0 || (part.mimeType && part.mimeType !== match[1])) unsupported(provider, part)
  return { mimeType: match[1]!, data: match[2]! }
}

/** Serialize ordered parts; unsupported inputs fail instead of becoming text projections. */
export function providerParts(message: Message, provider: Provider, multiModal = true): Array<Record<string, unknown>> | undefined {
  if (!message.parts?.length) return undefined
  return message.parts.map(part => {
    if (part.type === 'text') return provider === 'gemini' ? { text: part.text } : { type: 'text', text: part.text }
    if (!multiModal || (message.role !== 'user' && message.role !== 'assistant') || (part.type !== 'image' && part.type !== 'file')) unsupported(provider, part)
    const inline = dataSource(part, provider)
    const isUrl = /^https?:\/\//.test(part.source)
    if (provider === 'openai') {
      if (part.type === 'image') {
        if ((!inline && !isUrl) || (inline && !inline.mimeType.startsWith('image/'))) unsupported(provider, part)
        return { type: 'image_url', image_url: { url: part.source, ...(part.detail ? { detail: part.detail } : {}) } }
      }
      if (inline) return { type: 'file', file: { file_data: part.source, filename: part.filename ?? 'attachment' } }
      if (/^file-[\w-]+$/.test(part.source)) return { type: 'file', file: { file_id: part.source } }
      unsupported(provider, part)
    }
    if (provider === 'anthropic') {
      if (part.type === 'image' && inline && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(inline.mimeType)) unsupported(provider, part)
      const mimeType = inline?.mimeType ?? part.mimeType
      if (part.type === 'file' && mimeType !== 'application/pdf' && mimeType !== 'text/plain') unsupported(provider, part)
      if (inline?.mimeType === 'text/plain' && part.type === 'file') {
        const bytes = Uint8Array.from(atob(inline.data), c => c.charCodeAt(0))
        return { type: 'document', source: { type: 'text', media_type: 'text/plain', data: new TextDecoder('utf-8', { fatal: true }).decode(bytes) } }
      }
      if (!inline && !isUrl) unsupported(provider, part)
      return { type: part.type === 'image' ? 'image' : 'document', source: inline
        ? { type: 'base64', media_type: inline.mimeType, data: inline.data }
        : { type: 'url', url: part.source } }
    }
    if (provider === 'gemini') {
      if (inline) return { inlineData: inline }
      if (!part.mimeType || (!isUrl && !part.source.startsWith('gs://'))) unsupported(provider, part)
      return { fileData: { mimeType: part.mimeType, fileUri: part.source } }
    }
    if (!inline || !inline.mimeType.startsWith('image/')) unsupported(provider, part)
    return { image: inline.data }
  })
}
