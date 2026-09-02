import { parseCassette, serializeCassette } from './cassette'
import type { Cassette } from './types'

/**
 * Node-only helpers. Kept in a separate module so browser builds that
 * only need record/replay-in-memory don't pull `node:fs`.
 */
export async function saveCassette(path: string, cassette: Cassette): Promise<void> {
  const { writeFile, mkdir, rename, rm } = await import('node:fs/promises')
  const { dirname } = await import('node:path')
  const parent = dirname(path)
  await mkdir(parent, { recursive: true })
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    await writeFile(temporaryPath, serializeCassette(cassette), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export async function loadCassette(path: string): Promise<Cassette> {
  const { readFile } = await import('node:fs/promises')
  const raw = await readFile(path, 'utf8')
  return parseCassette(raw)
}
