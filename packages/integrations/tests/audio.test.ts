import { describe, it, expect } from 'vitest'
import { ErrorCodes, ToolError } from '@agentskit/core'
import { elevenlabsIntegration } from '../src/services/elevenlabs/index'
import { deepgramIntegration } from '../src/services/deepgram/index'
import { whisperIntegration } from '../src/services/whisper/index'
import { toToolDefinitions, type ProjectionConfig } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}

describe('elevenlabs', () => {
  it('valid + tts returns base64 audio with xi-api-key', async () => {
    expect(() => assertValidIntegration(elevenlabsIntegration)).not.toThrow()
    let url = ''; let key = ''
    const fetch = fakeFetch((u, init) => {
      url = u; key = String((init.headers as Record<string, string>)['xi-api-key'])
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    })
    const [tts] = toToolDefinitions(elevenlabsIntegration, { config: { apiKey: 'xi' }, fetch })
    const out = (await run(tts, { voice_id: 'v1', text: 'hi' })) as { bytesBase64: string; length: number }
    expect(out.length).toBe(3); expect(out.bytesBase64).toBe(Buffer.from([1, 2, 3]).toString('base64'))
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/v1'); expect(key).toBe('xi')
  })
})

describe('deepgram', () => {
  it('valid + transcribe by url with Token auth', async () => {
    expect(() => assertValidIntegration(deepgramIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((_u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return new Response(JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: 'hello world', words: [{ w: 'hello' }] }] }] } }), { status: 200 })
    })
    const [tr] = toToolDefinitions(deepgramIntegration, { config: { apiKey: 'dg' }, fetch })
    const out = (await run(tr, { url: 'http://a.mp3' })) as { text: string; words: unknown[] }
    expect(out.text).toBe('hello world'); expect(out.words).toHaveLength(1); expect(auth).toBe('Token dg')
  })
})

describe('whisper', () => {
  it('downloads model-controlled audio via fetchUntrusted and uploads via fetch', async () => {
    expect(() => assertValidIntegration(whisperIntegration)).not.toThrow()
    const untrustedCalls: string[] = []
    const providerCalls: Array<{ url: string; method: string; formBody: boolean }> = []

    const fetchUntrusted = fakeFetch((u) => {
      untrustedCalls.push(u)
      return new Response(new Uint8Array([9, 9]), { status: 200 })
    })
    const fetch = fakeFetch((u, init) => {
      providerCalls.push({
        url: u,
        method: String(init.method ?? 'GET'),
        formBody: init.body instanceof FormData,
      })
      if (u.includes('/audio/transcriptions')) {
        return new Response(JSON.stringify({ text: 'transcribed' }), { status: 200 })
      }
      return new Response(new Uint8Array([9, 9]), { status: 200 })
    })

    const projection: ProjectionConfig = {
      config: { apiKey: 'sk', model: 'whisper-1' },
      fetch,
      fetchUntrusted,
    }
    const [tr] = toToolDefinitions(whisperIntegration, projection)
    expect(await run(tr, { url: 'http://a.mp3' })).toEqual({ text: 'transcribed' })

    expect(untrustedCalls).toEqual(['http://a.mp3'])
    expect(providerCalls).toEqual([
      {
        url: 'https://api.openai.com/v1/audio/transcriptions',
        method: 'POST',
        formBody: true,
      },
    ])
    expect(providerCalls.some((c) => c.url === 'http://a.mp3')).toBe(false)
    expect(untrustedCalls.some((u) => u.includes('/audio/transcriptions'))).toBe(false)
  })

  it('rejects with AK_TOOL_INVALID_INPUT before any transport when fetchUntrusted is absent', async () => {
    let providerCalls = 0

    const fetch = fakeFetch(() => {
      providerCalls += 1
      return new Response(JSON.stringify({ text: 'should-not-run' }), { status: 200 })
    })
    const fetchUntrustedAbsent: ProjectionConfig = {
      config: { apiKey: 'sk', model: 'whisper-1' },
      fetch,
    }

    const [tr] = toToolDefinitions(whisperIntegration, fetchUntrustedAbsent)

    let caught: unknown
    try {
      await run(tr, { url: 'http://a.mp3' })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ToolError)
    expect(caught).toMatchObject({
      name: 'ToolError',
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
    })
    expect(providerCalls).toBe(0)
  })
})
