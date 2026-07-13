import type { Cassette } from './types'

const unavailable = (): Promise<never> => Promise.reject(new Error(
  'Cassette filesystem IO is available only in Node.js. Import from @agentskit/eval/replay/io in Node, or use serializeCassette and parseCassette with host storage.',
))

export function saveCassette(_path: string, _cassette: Cassette): Promise<void> {
  return unavailable()
}

export function loadCassette(_path: string): Promise<Cassette> {
  return unavailable()
}
