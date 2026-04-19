import { describe, expect, it, vi } from 'vitest'
import {
  loadConfluencePage,
  loadGoogleDriveFile,
  loadGitHubFile,
  loadGitHubTree,
  loadNotionPage,
  loadPdf,
  loadUrl,
} from '../src/loaders'

function makeFetch(sequence: Array<[number, unknown, 'json' | 'text' | 'binary']>) {
  const calls: string[] = []
  let i = 0
  const fake = vi.fn(async (url: string | URL | Request) => {
    calls.push(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url)
    const [status, payload, kind] = sequence[Math.min(i++, sequence.length - 1)]!
    if (kind === 'binary') return new Response(payload as Uint8Array, { status })
    if (kind === 'json') return new Response(JSON.stringify(payload), { status })
    return new Response(payload as string, { status })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, calls }
}

describe('loadUrl', () => {
  it('returns single document with URL source', async () => {
    const { fetch } = makeFetch([[200, 'hello', 'text']])
    const docs = await loadUrl('https://x', { fetch })
    expect(docs).toEqual([{ content: 'hello', source: 'https://x', metadata: { url: 'https://x' } }])
  })

  it('throws on non-ok response', async () => {
    const { fetch } = makeFetch([[500, 'boom', 'text']])
    await expect(loadUrl('https://x', { fetch })).rejects.toThrow(/loadUrl 500/)
  })
})

describe('loadGitHubFile', () => {
  it('hits raw.githubusercontent.com with ref', async () => {
    const { fetch, calls } = makeFetch([[200, 'content', 'text']])
    await loadGitHubFile('a', 'b', 'src/x.ts', { fetch, ref: 'main' })
    expect(calls[0]).toBe('https://raw.githubusercontent.com/a/b/main/src/x.ts')
  })
})

describe('loadGitHubTree', () => {
  it('fetches tree + expands matching files', async () => {
    const tree = {
      tree: [
        { path: 'a.ts', type: 'blob' },
        { path: 'b.md', type: 'blob' },
        { path: 'dir', type: 'tree' },
      ],
    }
    const { fetch } = makeFetch([
      [200, tree, 'json'],
      [200, 'content-a', 'text'],
      [200, 'content-b', 'text'],
    ])
    const docs = await loadGitHubTree('a', 'b', { fetch, maxFiles: 5 })
    expect(docs.map(d => d.metadata?.path).sort()).toEqual(['a.ts', 'b.md'])
  })

  it('filter skips files', async () => {
    const { fetch } = makeFetch([
      [200, { tree: [{ path: 'a.ts', type: 'blob' }, { path: 'b.md', type: 'blob' }] }, 'json'],
      [200, 'content-a', 'text'],
    ])
    const docs = await loadGitHubTree('a', 'b', {
      fetch,
      filter: path => path.endsWith('.ts'),
    })
    expect(docs.map(d => d.metadata?.path)).toEqual(['a.ts'])
  })
})

describe('loadNotionPage', () => {
  it('flattens paragraph + heading blocks', async () => {
    const { fetch } = makeFetch([
      [
        200,
        {
          results: [
            { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Title' }] } },
            { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'body' }] } },
          ],
        },
        'json',
      ],
    ])
    const docs = await loadNotionPage('p1', { token: 't', fetch })
    expect(docs[0]!.content).toContain('# Title')
    expect(docs[0]!.content).toContain('body')
  })
})

describe('loadConfluencePage', () => {
  it('reads storage body', async () => {
    const { fetch } = makeFetch([[200, { body: { storage: { value: '<p>hi</p>' } }, title: 'Page' }, 'json']])
    const docs = await loadConfluencePage('123', {
      baseUrl: 'https://x.atlassian.net',
      token: 'dG9rZW4=',
      fetch,
    })
    expect(docs[0]!.content).toContain('<p>hi</p>')
    expect(docs[0]!.metadata?.title).toBe('Page')
  })
})

describe('loadGoogleDriveFile', () => {
  it('exports as text/plain via Drive API', async () => {
    const { fetch, calls } = makeFetch([[200, 'hello drive', 'text']])
    const docs = await loadGoogleDriveFile('file-1', { accessToken: 'tok', fetch })
    expect(docs[0]!.content).toBe('hello drive')
    expect(calls[0]).toContain('export?mimeType=text/plain')
  })
})

describe('loadPdf', () => {
  it('passes bytes into the configured parser', async () => {
    const { fetch } = makeFetch([[200, new Uint8Array([1, 2, 3]), 'binary']])
    const parser = vi.fn(async () => ({ text: 'parsed', pages: 2 }))
    const docs = await loadPdf('https://x/doc.pdf', { parsePdf: parser, fetch })
    expect(parser).toHaveBeenCalled()
    expect(docs[0]!.content).toBe('parsed')
    expect(docs[0]!.metadata?.pages).toBe(2)
  })
})
