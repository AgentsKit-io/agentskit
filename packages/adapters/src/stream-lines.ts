import { parseSSE } from '@agentskit/net'

/** Read data strings from Server-Sent Events through the shared network parser.
 *
 * @deprecated Use `parseSSE` from `@agentskit/net` and read each event's
 * `data` field. Removal is no earlier than adapters 0.20.0 and 90 days after
 * this deprecation, whichever is later.
 *
 * @param stream Byte stream containing Server-Sent Events.
 * @returns Event data strings; multiline data fields are joined with `\n`.
 * @throws {NetError} With code AK_NET_SSE_PARSE_FAILED when the shared parser rejects an event.
 * @example
 * ```ts
 * for await (const data of readSSELines(response.body!)) console.log(data)
 * ```
 */
export async function* readSSELines(stream: ReadableStream): AsyncIterableIterator<string> {
  for await (const event of parseSSE(stream)) yield event.data
}

/**
 * Read non-empty, trimmed NDJSON lines from a UTF-8 byte stream. Flushes any
 * buffered UTF-8 bytes and yields a final line even when it has no newline.
 *
 * @param stream Byte stream containing one JSON value per line.
 * @returns Non-empty trimmed JSON line strings.
 * @example
 * ```ts
 * for await (const line of readNDJSONLines(response.body!)) console.log(JSON.parse(line))
 * ```
 */
export async function* readNDJSONLines(stream: ReadableStream): AsyncIterableIterator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      if (done) {
        const trimmed = buffer.trim()
        if (trimmed) yield trimmed
        break
      }

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) yield trimmed
      }
    }
  } finally {
    reader.releaseLock()
  }
}
