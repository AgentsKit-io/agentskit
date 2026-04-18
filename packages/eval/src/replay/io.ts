import { parseCassette, serializeCassette } from './cassette'
import type { Cassette } from './types'

/**
 * Node-only helpers. Kept in a separate module so browser builds that
 * only need record/replay-in-memory don't pull `node:fs`.
 */
export async function saveCassette(path: string, cassette: Cassette): Promise<void> {
  const { writeFile, mkdir } = await import('node:fs/promises')
  const { dirname } = await import('node:path')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, serializeCassette(cassette), 'utf8')
}

export async function loadCassette(path: string): Promise<Cassette> {
  const { readFile } = await import('node:fs/promises')
  const raw = await readFile(path, 'utf8')
  return parseCassette(raw)
}
