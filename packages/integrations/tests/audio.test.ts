import { describe, it, expect } from 'vitest'
import { elevenlabsIntegration } from '../src/services/elevenlabs/index'
import { deepgramIntegration } from '../src/services/deepgram/index'
import { whisperIntegration } from '../src/services/whisper/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
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
  it('valid + fetches audio then multipart-uploads', async () => {
    expect(() => assertValidIntegration(whisperIntegration)).not.toThrow()
    const calls: string[] = []
    const fetch = fakeFetch((u, init) => {
      calls.push(u)
      if (u.includes('/audio/transcriptions')) {
        expect(init.body).toBeInstanceOf(FormData)
        return new Response(JSON.stringify({ text: 'transcribed' }), { status: 200 })
      }
      return new Response(new Uint8Array([9, 9]), { status: 200 })
    })
    const [tr] = toToolDefinitions(whisperIntegration, { config: { apiKey: 'sk', model: 'whisper-1' }, fetch })
    expect(await run(tr, { url: 'http://a.mp3' })).toEqual({ text: 'transcribed' })
    expect(calls[0]).toBe('http://a.mp3'); expect(calls[1]).toContain('/audio/transcriptions')
  })
})
