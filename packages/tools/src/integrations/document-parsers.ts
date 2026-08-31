import { ConfigError, ErrorCodes, ToolError, defineTool } from '@agentskit/core'
import { checkEgress, safeFetch } from '../safe-fetch'
import type { EgressPolicy } from '../safe-fetch'

/**
 * Document parsing tools. The underlying parsers (`pdf-parse`,
 * `mammoth`, `xlsx`, ...) are heavy and native-dep-prone — instead
 * of bundling them, accept BYO parser functions that match the
 * minimal contract below.
 */

export interface DocumentParserFns {
  parsePdf?: (bytes: Uint8Array) => Promise<{ text: string; pages?: number }> | { text: string; pages?: number }
  parseDocx?: (bytes: Uint8Array) => Promise<{ text: string }> | { text: string }
  parseXlsx?: (bytes: Uint8Array) => Promise<{ sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }> }> | { sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }> }
}

export interface DocumentParsersConfig extends DocumentParserFns {
  /** Custom fetch (tests). */
  fetch?: typeof globalThis.fetch
  /** Egress policy for model-provided document URLs. */
  allowPrivateHosts?: EgressPolicy['allowPrivateHosts']
  allowedHosts?: EgressPolicy['allowedHosts']
  maxRedirects?: EgressPolicy['maxRedirects']
  /** Maximum downloaded document size. Defaults to 10 MiB. */
  maxBytes?: number
  /** Download timeout. Defaults to 15 seconds. */
  timeoutMs?: number
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 15_000

async function download(url: string, config: DocumentParsersConfig): Promise<Uint8Array> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'invalid document URL' })
  }
  const policy: EgressPolicy = {
    allowPrivateHosts: config.allowPrivateHosts,
    allowedHosts: config.allowedHosts,
    maxRedirects: config.maxRedirects,
  }
  const blocked = await checkEgress(parsed, policy)
  if (blocked) throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: blocked })

  const maxBytes = config.maxBytes ?? DEFAULT_MAX_BYTES
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isInteger(maxBytes) || maxBytes <= 0 || !Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'document parser limits must be positive integers',
    })
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const fetchImpl = config.fetch ?? globalThis.fetch
  try {
    const response = fetchImpl === globalThis.fetch
      ? await safeFetch(url, { signal: controller.signal }, policy)
      : await fetchImpl(url, { signal: controller.signal, redirect: 'error' })
    if (!response.ok) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `document download failed with status ${response.status}`,
      })
    }
    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > maxBytes) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `document exceeds maxBytes (${maxBytes})` })
    }
    if (!response.body) {
      const buf = await response.arrayBuffer()
      if (buf.byteLength > maxBytes) {
        throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `document exceeds maxBytes (${maxBytes})` })
      }
      return new Uint8Array(buf)
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `document exceeds maxBytes (${maxBytes})` })
      }
      chunks.push(next.value)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `document download timed out after ${timeoutMs}ms` })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function parsePdf(config: DocumentParsersConfig) {
  return defineTool({
    name: 'parse_pdf',
    description: 'Extract text from a PDF file referenced by URL.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    } as const,
    async execute({ url }) {
      if (!config.parsePdf) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'parse_pdf: no parsePdf function configured',
          hint: 'Pass parsePdf in DocumentParsersConfig (e.g. wrap pdf-parse).',
        })
      }
      const bytes = await download(String(url), config)
      const { text, pages } = await config.parsePdf(bytes)
      return { text, pages }
    },
  })
}

export function parseDocx(config: DocumentParsersConfig) {
  return defineTool({
    name: 'parse_docx',
    description: 'Extract text from a DOCX file referenced by URL.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    } as const,
    async execute({ url }) {
      if (!config.parseDocx) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'parse_docx: no parseDocx function configured',
          hint: 'Pass parseDocx in DocumentParsersConfig (e.g. wrap mammoth).',
        })
      }
      const bytes = await download(String(url), config)
      const { text } = await config.parseDocx(bytes)
      return { text }
    },
  })
}

export function parseXlsx(config: DocumentParsersConfig) {
  return defineTool({
    name: 'parse_xlsx',
    description: 'Extract sheets + rows from an XLSX workbook referenced by URL.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        sheet: { type: 'string', description: 'Return just this sheet if provided.' },
      },
      required: ['url'],
    } as const,
    async execute({ url, sheet }) {
      if (!config.parseXlsx) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'parse_xlsx: no parseXlsx function configured',
          hint: 'Pass parseXlsx in DocumentParsersConfig (e.g. wrap xlsx).',
        })
      }
      const bytes = await download(String(url), config)
      const parsed = await config.parseXlsx(bytes)
      if (sheet) return parsed.sheets.filter(s => s.name === sheet)
      return parsed.sheets
    },
  })
}

export function documentParsers(config: DocumentParsersConfig) {
  const tools = []
  if (config.parsePdf) tools.push(parsePdf(config))
  if (config.parseDocx) tools.push(parseDocx(config))
  if (config.parseXlsx) tools.push(parseXlsx(config))
  return tools
}
