import { describe, expect, it, vi } from 'vitest'
import {
  browserAgent,
  browserClick,
  browserFill,
  browserGoto,
  browserRead,
  browserScreenshot,
  browserWait,
  coingecko,
  coingeckoMarketChart,
  coingeckoPrice,
  deepgram,
  deepgramTranscribe,
  documentParsers,
  elevenlabs,
  elevenlabsTts,
  firecrawl,
  firecrawlCrawl,
  firecrawlScrape,
  maps,
  mapsGeocode,
  mapsReverseGeocode,
  openaiImages,
  openaiImagesGenerate,
  parseDocx,
  parsePdf,
  parseXlsx,
  reader,
  readerFetch,
  weather,
  weatherCurrent,
  whisper,
  whisperTranscribe,
} from '../src/integrations'

function mockJson(payload: unknown, opts: { status?: number } = {}) {
  const capture: { url?: string; init?: RequestInit } = {}
  const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    capture.url = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    capture.init = init
    return new Response(JSON.stringify(payload), { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, capture }
}

function mockText(text: string, opts: { status?: number } = {}) {
  const capture: { url?: string; init?: RequestInit } = {}
  const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    capture.url = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    capture.init = init
    return new Response(text, { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, capture }
}

function mockBinary(bytes: Uint8Array, opts: { status?: number } = {}) {
  const capture: { url?: string } = {}
  const fake = vi.fn(async (url: string | URL | Request) => {
    capture.url = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    const view = new Uint8Array(bytes)
    return new Response(view, { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, capture }
}

const ctx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

describe('firecrawl', () => {
  it('scrape returns markdown + metadata', async () => {
    const { fetch } = mockJson({ data: { markdown: '# hi', metadata: { title: 't' } } })
    const tool = firecrawlScrape({ apiKey: 'k', fetch })
    const out = await tool.execute!({ url: 'https://example.com' }, ctx)
    expect(out).toEqual({ markdown: '# hi', metadata: { title: 't' } })
  })

  it('crawl returns job id', async () => {
    const { fetch } = mockJson({ id: 'job1', url: 'https://example.com' })
    const tool = firecrawlCrawl({ apiKey: 'k', fetch })
    const out = await tool.execute!({ url: 'https://example.com' }, ctx)
    expect(out).toMatchObject({ jobId: 'job1' })
  })

  it('firecrawl() bundles two tools', () => {
    expect(firecrawl({ apiKey: 'k' })).toHaveLength(2)
  })
})

describe('reader', () => {
  it('returns plain text from the reader endpoint', async () => {
    const { fetch, capture } = mockText('page text')
    const tool = readerFetch({ fetch })
    const out = await tool.execute!({ url: 'https://example.com' }, ctx)
    expect(out).toBe('page text')
    expect(capture.url).toContain('r.jina.ai')
  })

  it('attaches bearer token when provided', async () => {
    const { fetch, capture } = mockText('ok')
    const tool = readerFetch({ fetch, apiKey: 'tok' })
    await tool.execute!({ url: 'x' }, ctx)
    const headers = (capture.init?.headers ?? {}) as Record<string, string>
    expect(headers.authorization).toBe('Bearer tok')
  })

  it('throws on non-2xx', async () => {
    const { fetch } = mockText('boom', { status: 500 })
    const tool = readerFetch({ fetch })
    await expect(tool.execute!({ url: 'x' }, ctx)).rejects.toThrow(/reader 500/)
  })

  it('reader() bundles one tool', () => {
    expect(reader()).toHaveLength(1)
  })
})

describe('document parsers', () => {
  it('parsePdf requires a configured parser', async () => {
    const tool = parsePdf({})
    await expect(tool.execute!({ url: 'https://x' }, ctx)).rejects.toThrow(/no parsePdf/)
  })

  it('parsePdf invokes the BYO parser on fetched bytes', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const { fetch } = mockBinary(bytes)
    const parser = vi.fn(async () => ({ text: 'hello', pages: 1 }))
    const tool = parsePdf({ parsePdf: parser, fetch })
    const out = await tool.execute!({ url: 'https://x/doc.pdf' }, ctx)
    expect(parser).toHaveBeenCalled()
    expect(out).toEqual({ text: 'hello', pages: 1 })
  })

  it('parseDocx delegates to the BYO parser', async () => {
    const { fetch } = mockBinary(new Uint8Array([1]))
    const tool = parseDocx({ parseDocx: async () => ({ text: 'doc' }), fetch })
    const out = await tool.execute!({ url: 'https://x/doc.docx' }, ctx)
    expect(out).toEqual({ text: 'doc' })
  })

  it('parseXlsx returns sheets filtered by name when requested', async () => {
    const { fetch } = mockBinary(new Uint8Array([1]))
    const tool = parseXlsx({
      parseXlsx: async () => ({ sheets: [{ name: 'A', rows: [] }, { name: 'B', rows: [] }] }),
      fetch,
    })
    const out = (await tool.execute!({ url: 'https://x.xlsx', sheet: 'B' }, ctx)) as Array<Record<string, unknown>>
    expect(out).toHaveLength(1)
    expect(out[0]!.name).toBe('B')
  })

  it('documentParsers() only bundles configured parsers', () => {
    expect(documentParsers({ parsePdf: async () => ({ text: '' }) })).toHaveLength(1)
    expect(documentParsers({})).toHaveLength(0)
  })
})

describe('openai images', () => {
  it('generate posts to /images/generations', async () => {
    const { fetch, capture } = mockJson({ data: [{ url: 'u', revised_prompt: 'r' }] })
    const tool = openaiImagesGenerate({ apiKey: 'k', fetch })
    const out = (await tool.execute!({ prompt: 'a cat' }, ctx)) as Array<Record<string, unknown>>
    expect(capture.url).toContain('/images/generations')
    expect(out[0]).toMatchObject({ url: 'u', revisedPrompt: 'r' })
  })

  it('bundles one tool', () => {
    expect(openaiImages({ apiKey: 'k' })).toHaveLength(1)
  })
})

describe('elevenlabs', () => {
  it('tts returns base64 audio payload', async () => {
    const { fetch } = mockBinary(new Uint8Array([1, 2, 3]))
    const tool = elevenlabsTts({ apiKey: 'k', fetch })
    const out = (await tool.execute!({ voice_id: 'v', text: 'hello' }, ctx)) as Record<string, unknown>
    expect(out.contentType).toBe('audio/mpeg')
    expect(typeof out.bytesBase64).toBe('string')
    expect(out.length).toBe(3)
  })

  it('throws on non-ok response', async () => {
    const { fetch } = mockText('oops', { status: 401 })
    const tool = elevenlabsTts({ apiKey: 'k', fetch })
    await expect(tool.execute!({ voice_id: 'v', text: 'x' }, ctx)).rejects.toThrow(/elevenlabs 401/)
  })

  it('bundles one tool', () => {
    expect(elevenlabs({ apiKey: 'k' })).toHaveLength(1)
  })
})

describe('whisper', () => {
  it('transcribes audio fetched from URL', async () => {
    // First fetch: audio bytes.  Second fetch: transcription response.
    let call = 0
    const fake = vi.fn(async (url: string | URL | Request) => {
      call++
      if (call === 1) return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      return new Response(JSON.stringify({ text: 'hi' }), { status: 200 })
    }) as unknown as typeof globalThis.fetch
    const tool = whisperTranscribe({ apiKey: 'k', fetch: fake })
    const out = await tool.execute!({ url: 'https://x/audio.mp3' }, ctx)
    expect(out).toEqual({ text: 'hi' })
    expect(call).toBe(2)
  })

  it('bundles one tool', () => {
    expect(whisper({ apiKey: 'k' })).toHaveLength(1)
  })
})

describe('deepgram', () => {
  it('pulls transcript + words from channel alternatives', async () => {
    const { fetch } = mockJson({
      results: { channels: [{ alternatives: [{ transcript: 'hello there', words: [{ word: 'hello' }] }] }] },
    })
    const tool = deepgramTranscribe({ apiKey: 'k', fetch })
    const out = await tool.execute!({ url: 'https://x.mp3' }, ctx)
    expect(out).toEqual({ text: 'hello there', words: [{ word: 'hello' }] })
  })

  it('bundles one tool', () => {
    expect(deepgram({ apiKey: 'k' })).toHaveLength(1)
  })
})

describe('maps', () => {
  it('geocode returns coords + label', async () => {
    const { fetch } = mockJson([{ lat: '10.5', lon: '-20.4', display_name: 'Somewhere' }])
    const tool = mapsGeocode({ fetch })
    const out = await tool.execute!({ query: 'somewhere' }, ctx)
    expect(out).toEqual({ lat: 10.5, lon: -20.4, label: 'Somewhere' })
  })

  it('geocode returns null when nothing found', async () => {
    const { fetch } = mockJson([])
    const tool = mapsGeocode({ fetch })
    expect(await tool.execute!({ query: 'x' }, ctx)).toBeNull()
  })

  it('reverseGeocode flattens address + label', async () => {
    const { fetch } = mockJson({ display_name: 'Here', address: { city: 'City' } })
    const tool = mapsReverseGeocode({ fetch })
    const out = await tool.execute!({ lat: 1, lon: 2 }, ctx)
    expect(out).toEqual({ label: 'Here', address: { city: 'City' } })
  })

  it('bundles two tools', () => {
    expect(maps()).toHaveLength(2)
  })
})

describe('weather', () => {
  it('flattens OWM fields', async () => {
    const { fetch, capture } = mockJson({
      name: 'X',
      weather: [{ description: 'clear sky', main: 'Clear' }],
      main: { temp: 20, humidity: 40 },
      wind: { speed: 3 },
    })
    const tool = weatherCurrent({ apiKey: 'k', fetch })
    const out = await tool.execute!({ lat: 10, lon: 20 }, ctx)
    expect(out).toMatchObject({ location: 'X', summary: 'clear sky', temperature: 20 })
    expect(capture.url).toContain('appid=k')
  })

  it('bundles one tool', () => {
    expect(weather({ apiKey: 'k' })).toHaveLength(1)
  })
})

describe('coingecko', () => {
  it('price returns raw payload', async () => {
    const { fetch } = mockJson({ bitcoin: { usd: 50000 } })
    const tool = coingeckoPrice()
    const override = coingeckoPrice({ fetch })
    expect(tool).toBeDefined()
    const out = await override.execute!({ ids: 'bitcoin' }, ctx)
    expect(out).toEqual({ bitcoin: { usd: 50000 } })
  })

  it('marketChart returns prices series', async () => {
    const { fetch } = mockJson({ prices: [[1, 10], [2, 11]] })
    const tool = coingeckoMarketChart({ fetch })
    const out = await tool.execute!({ id: 'bitcoin' }, ctx)
    expect(out).toEqual({ prices: [[1, 10], [2, 11]] })
  })

  it('bundles two tools', () => {
    expect(coingecko()).toHaveLength(2)
  })
})

describe('browser agent', () => {
  const createPage = () => {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const page = {
      goto: async (url: string) => {
        calls.push({ method: 'goto', args: [url] })
      },
      click: async (selector: string) => {
        calls.push({ method: 'click', args: [selector] })
      },
      fill: async (selector: string, value: string) => {
        calls.push({ method: 'fill', args: [selector, value] })
      },
      textContent: async (selector: string) => {
        calls.push({ method: 'textContent', args: [selector] })
        return `text of ${selector}`
      },
      screenshot: async () => {
        calls.push({ method: 'screenshot', args: [] })
        return 'base64png'
      },
      waitForSelector: async (selector: string, options?: { timeoutMs?: number }) => {
        calls.push({ method: 'waitForSelector', args: [selector, options] })
      },
    }
    return { page, calls }
  }

  it('goto invokes page.goto', async () => {
    const { page, calls } = createPage()
    await browserGoto({ page }).execute!({ url: 'https://x' }, ctx)
    expect(calls[0]).toEqual({ method: 'goto', args: ['https://x'] })
  })

  it('click/fill/read/wait each delegate properly', async () => {
    const { page, calls } = createPage()
    await browserClick({ page }).execute!({ selector: '.a' }, ctx)
    await browserFill({ page }).execute!({ selector: '#b', value: 'v' }, ctx)
    const readResult = await browserRead({ page }).execute!({ selector: '.c' }, ctx)
    await browserWait({ page }).execute!({ selector: '#d', timeout_ms: 500 }, ctx)
    expect(readResult).toEqual({ text: 'text of .c' })
    expect(calls.map(c => c.method)).toEqual(['click', 'fill', 'textContent', 'waitForSelector'])
  })

  it('screenshot returns base64 payload', async () => {
    const { page } = createPage()
    const out = await browserScreenshot({ page }).execute!({}, ctx)
    expect(out).toEqual({ contentType: 'image/png', bytesBase64: 'base64png' })
  })

  it('bundle exposes six tools', () => {
    const { page } = createPage()
    expect(browserAgent({ page })).toHaveLength(6)
  })
})
