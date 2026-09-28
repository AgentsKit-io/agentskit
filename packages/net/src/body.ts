import { NetError, NetErrorCodes, invalidInput } from './errors'

export interface ReadBodyOptions {
  /** Refuse bodies larger than this many bytes. */
  maxBytes: number
}

function tooLarge(maxBytes: number, seen: string): NetError {
  return new NetError({
    code: NetErrorCodes.AK_NET_BODY_TOO_LARGE,
    message: `Response body exceeds ${maxBytes} bytes (${seen})`,
    hint: 'Raise maxBytes if the source is trusted, or stream the body instead of buffering it.',
  })
}

/**
 * Read a response body into memory, failing fast when it is larger than
 * `maxBytes`: a declared `Content-Length` is checked first, then bytes are
 * counted while streaming and the stream is cancelled on overflow.
 */
export async function readBody(response: Response, options: ReadBodyOptions): Promise<Uint8Array> {
  const { maxBytes } = options
  if (!Number.isInteger(maxBytes) || maxBytes < 0) throw invalidInput('maxBytes must be a non-negative integer')
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    void response.body?.cancel().catch(() => {})
    throw tooLarge(maxBytes, `Content-Length ${declared}`)
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      throw tooLarge(maxBytes, `${total}+ bytes received`)
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

/** {@link readBody}, decoded as UTF-8. */
export async function readText(response: Response, options: ReadBodyOptions): Promise<string> {
  return new TextDecoder().decode(await readBody(response, options))
}

/** {@link readText}, parsed as JSON. */
export async function readJson<T = unknown>(response: Response, options: ReadBodyOptions): Promise<T> {
  return JSON.parse(await readText(response, options)) as T
}
