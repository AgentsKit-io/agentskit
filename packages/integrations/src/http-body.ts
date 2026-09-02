import { ErrorCodes, ToolError } from '@agentskit/core'

function fail(maxBytes: number): never {
  throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `HTTP response exceeds maxResponseBytes (${maxBytes})` })
}

async function readBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const length = response.headers.get('content-length')
  if (length && Number(length) > maxBytes) fail(maxBytes)
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maxBytes) fail(maxBytes)
    return bytes
  }
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    total += next.value.byteLength
    if (total > maxBytes) { await reader.cancel(); fail(maxBytes) }
    chunks.push(next.value)
  }
  const bytes = new Uint8Array(total); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export function readResponseBytes(response: Response, maxBytes = 2 * 1024 * 1024): Promise<Uint8Array> {
  return readBytes(response, maxBytes)
}

export async function readResponseText(response: Response, maxBytes = 2 * 1024 * 1024): Promise<string> {
  return new TextDecoder().decode(await readBytes(response, maxBytes))
}
