import { ConfigError, ErrorCodes } from '@agentskit/core'

const encoder = new TextEncoder()
const TOOL_NAME = /^[A-Za-z0-9_.-]+$/

const invalid = (message: string): ConfigError =>
  new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message })

export const assertNonEmptyString = (
  input: unknown,
  field: string,
  maxBytes: number,
): string => {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw invalid(`${field} must be a non-empty string`)
  }
  if (encoder.encode(input).byteLength > maxBytes) {
    throw invalid(`${field} must not exceed ${maxBytes} bytes`)
  }
  return input.trim()
}

export const assertToolName = (input: unknown, field = 'tool name'): string => {
  const value = assertNonEmptyString(input, field, 128)
  if (!TOOL_NAME.test(value)) {
    throw invalid(`${field} may contain only ASCII letters, digits, underscore, hyphen, and dot`)
  }
  return value
}

export const assertPositiveInteger = (
  input: unknown,
  field: string,
  maximum: number,
): number => {
  if (!Number.isSafeInteger(input) || (input as number) < 1 || (input as number) > maximum) {
    throw invalid(`${field} must be a safe integer between 1 and ${maximum}`)
  }
  return input as number
}

export const isRecord = (input: unknown): input is Record<string, unknown> => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false
  try {
    const prototype = Object.getPrototypeOf(input) as object | null
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}
