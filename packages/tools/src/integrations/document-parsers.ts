import { ConfigError, ErrorCodes, ToolError, defineTool } from '@agentskit/core'
import { NetError, NetErrorCodes, readBody } from '@agentskit/net'
import { checkEgress, safeFetch } from '../safe-fetch'
import type { EgressPolicy } from '../safe-fetch'

/**
 * Document parsing tools. The underlying parsers (`pdf-parse`,
 * `mammoth`, `xlsx`, ...) are heavy and native-dep-prone — instead
 * of bundling them, accept BYO parser functions that match the
 * minimal contract below.
 */

/** Optional parser functions supplied by the host for supported document formats. */
export interface DocumentParserFns {
  parsePdf?: (bytes: Uint8Array) => Promise<{ text: string; pages?: number }> | { text: string; pages?: number }
  parseDocx?: (bytes: Uint8Array) => Promise<{ text: string }> | { text: string }
  parseXlsx?: (bytes: Uint8Array) => Promise<{ sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }> }> | { sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }> }
}

/** Parser, download, and egress settings for document parsing tools. */
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
    try {
      return await readBody(response, { maxBytes })
    } catch (error) {
      if (error instanceof NetError && error.code === NetErrorCodes.AK_NET_BODY_TOO_LARGE) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `document exceeds maxBytes (${maxBytes})`,
          cause: error,
        })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `document download timed out after ${timeoutMs}ms` })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Create a tool that downloads a PDF and returns parser-provided text and page count.
 *
 * @param config Parser and download configuration.
 * @returns A PDF parsing tool. */
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

/** Create a tool that downloads a DOCX file and returns parser-provided text.
 *
 * @param config Parser and download configuration.
 * @returns A DOCX parsing tool. */
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

/** Create a tool that downloads an XLSX workbook and returns its sheets or a selected sheet.
 *
 * @param config Parser and download configuration.
 * @returns An XLSX parsing tool. */
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

/** Build parsing tools only for parser functions supplied in the configuration.
 * @example
 * const tools = documentParsers({ parsePdf: bytes => parsePdfBytes(bytes) })

 *
 * @param config Parser and download configuration.
 * @returns Tools for configured formats. */
export function documentParsers(config: DocumentParsersConfig) {
  const tools = []
  if (config.parsePdf) tools.push(parsePdf(config))
  if (config.parseDocx) tools.push(parseDocx(config))
  if (config.parseXlsx) tools.push(parseXlsx(config))
  return tools
}
