import { ConfigError, ErrorCodes } from '../errors'

export const MAX_JWKS_BYTES = 1_048_576

export async function readJwksBody(response: Response): Promise<unknown> {
  if (!response.body) return response.json()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_JWKS_BYTES) {
      await reader.cancel().catch(() => {})
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `JWKS response exceeds the ${MAX_JWKS_BYTES}-byte limit`,
      })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}
