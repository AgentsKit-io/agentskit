import {
  ConfigError,
  ErrorCodes,
  RuntimeError,
  type AdapterFactory,
  type AdapterRequest,
  type StreamSource,
} from '@agentskit/core'
import { fingerprintRequest, lastUserContent } from './cassette'
import { defensiveSnapshot } from './clone'
import type { Cassette, CassetteEntry, ReplayOptions } from './types'

const VALID_MODES = new Set(['strict', 'sequential', 'loose'] as const)

function resolveMode(mode: ReplayOptions['mode']): 'strict' | 'sequential' | 'loose' {
  if (mode === undefined) return 'strict'
  if (typeof mode !== 'string' || !VALID_MODES.has(mode as 'strict' | 'sequential' | 'loose')) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `Invalid replay mode: ${String(mode)}`,
    })
  }
  return mode
}

/**
 * Build an AdapterFactory that replays a previously recorded cassette.
 * Matching modes:
 *  - strict: require exact fingerprint match
 *  - sequential: pop next unused entry
 *  - loose: match by last user message content
 */
export function createReplayAdapter(cassette: Cassette, options: ReplayOptions = {}): AdapterFactory {
  const mode = resolveMode(options.mode)
  const entries = defensiveSnapshot(cassette.entries)
  const used = new Set<number>()
  let cursor = 0

  const findEntry = (request: AdapterRequest): CassetteEntry => {
    if (mode === 'sequential') {
      const entry = entries[cursor]
      if (!entry) {
        throw new RuntimeError({
          code: ErrorCodes.AK_RUNTIME_STEP_FAILED,
          message: `Replay exhausted at index ${cursor}`,
        })
      }
      cursor++
      return defensiveSnapshot(entry)
    }

    if (mode === 'loose') {
      const target = lastUserContent(request)
      for (let i = 0; i < entries.length; i++) {
        if (used.has(i)) continue
        if (lastUserContent(entries[i]!.request) === target) {
          used.add(i)
          return defensiveSnapshot(entries[i]!)
        }
      }
      throw new RuntimeError({
        code: ErrorCodes.AK_RUNTIME_STEP_FAILED,
        message: `Replay miss (loose): no entry for user message "${target}"`,
      })
    }

    const target = fingerprintRequest(request)
    for (let i = 0; i < entries.length; i++) {
      if (used.has(i)) continue
      if (fingerprintRequest(entries[i]!.request) === target) {
        used.add(i)
        return defensiveSnapshot(entries[i]!)
      }
    }
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_STEP_FAILED,
      message: 'Replay miss (strict): no matching request fingerprint',
    })
  }

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const entry = findEntry(request)
      return {
        abort: () => {},
        stream: async function* () {
          for (const chunk of entry.chunks) yield defensiveSnapshot(chunk)
        },
      }
    },
  }
}
