import { ErrorCodes, ToolError } from '@agentskit/core'
import { NetError, NetErrorCodes, readBody, readJson, readText } from '@agentskit/net'

function readFailure(error: unknown, maxBytes: number): never {
  if (!(error instanceof NetError)) throw error
  const tooLarge = error.code === NetErrorCodes.AK_NET_BODY_TOO_LARGE
  throw new ToolError({
    code: tooLarge ? ErrorCodes.AK_TOOL_EXEC_FAILED : ErrorCodes.AK_TOOL_INVALID_INPUT,
    message: tooLarge ? `HTTP response exceeds maxResponseBytes (${maxBytes})` : error.message,
    hint: error.hint,
    cause: error,
  })
}

/**
 * Read response bytes through the shared bounded stream reader.
 *
 * @param response Fetch response to consume.
 * @param maxBytes Non-negative integer byte count; defaults to 2 MiB.
 * @returns The complete response body as bytes.
 * @throws {ToolError} With code AK_TOOL_EXEC_FAILED and a `NetError` cause when the body is too large.
 * @throws {ToolError} With code AK_TOOL_INVALID_INPUT and a `NetError` cause when maxBytes is invalid.
 * @example
 * ```ts
 * import { readResponseBytes } from './http-body'
 *
 * const audioUrl = 'https://api.example.com/audio'
 * const response = await fetch(audioUrl)
 * const bytes = await readResponseBytes(response, 4 * 1024 * 1024)
 * ```
 */
export async function readResponseBytes(response: Response, maxBytes = 2 * 1024 * 1024): Promise<Uint8Array> {
  try {
    return await readBody(response, { maxBytes })
  } catch (error) {
    return readFailure(error, maxBytes)
  }
}

/**
 * Read a response body as UTF-8 text through the shared bounded stream reader.
 *
 * @param response Fetch response to consume.
 * @param maxBytes Non-negative integer byte count before rejecting; defaults to 2 MiB.
 * @returns The decoded response body.
 * @throws {ToolError} With code AK_TOOL_EXEC_FAILED and a `NetError` cause when the body is too large.
 * @throws {ToolError} With code AK_TOOL_INVALID_INPUT and a `NetError` cause when maxBytes is invalid.
 * @example
 * ```ts
 * import { readResponseText } from '@agentskit/integrations'
 *
 * const response = await fetch('https://api.example.com/status')
 * const text = await readResponseText(response, 64 * 1024)
 * ```
 */
export async function readResponseText(response: Response, maxBytes = 2 * 1024 * 1024): Promise<string> {
  try {
    return await readText(response, { maxBytes })
  } catch (error) {
    return readFailure(error, maxBytes)
  }
}

export async function readResponseJson<T = unknown>(response: Response, maxBytes = 2 * 1024 * 1024): Promise<T> {
  try {
    return await readJson<T>(response, { maxBytes })
  } catch (error) {
    return readFailure(error, maxBytes)
  }
}
