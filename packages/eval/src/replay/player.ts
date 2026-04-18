import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { fingerprintRequest, lastUserContent } from './cassette'
import type { Cassette, CassetteEntry, ReplayOptions } from './types'

/**
 * Build an AdapterFactory that replays a previously recorded cassette.
 * Matching modes:
 *  - strict: require exact fingerprint match
 *  - sequential: pop next unused entry
 *  - loose: match by last user message content
 */
export function createReplayAdapter(cassette: Cassette, options: ReplayOptions = {}): AdapterFactory {
  const mode = options.mode ?? 'strict'
  const used = new Set<number>()
  let cursor = 0

  const findEntry = (request: AdapterRequest): CassetteEntry => {
    if (mode === 'sequential') {
      const entry = cassette.entries[cursor]
      if (!entry) throw new Error(`Replay exhausted at index ${cursor}`)
      cursor++
      return entry
    }

    if (mode === 'loose') {
      const target = lastUserContent(request)
      for (let i = 0; i < cassette.entries.length; i++) {
        if (used.has(i)) continue
        if (lastUserContent(cassette.entries[i]!.request) === target) {
          used.add(i)
          return cassette.entries[i]!
        }
      }
      throw new Error(`Replay miss (loose): no entry for user message "${target}"`)
    }

    const target = fingerprintRequest(request)
    for (let i = 0; i < cassette.entries.length; i++) {
      if (used.has(i)) continue
      if (fingerprintRequest(cassette.entries[i]!.request) === target) {
        used.add(i)
        return cassette.entries[i]!
      }
    }
    throw new Error(`Replay miss (strict): no matching request fingerprint`)
  }

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const entry = findEntry(request)
      return {
        abort: () => {},
        stream: async function* () {
          for (const chunk of entry.chunks) yield chunk
        },
      }
    },
  }
}
