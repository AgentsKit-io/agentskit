import { describe, expect, it, vi } from 'vitest'
import {
  loadConfluencePage,
  loadDropbox,
  loadGcs,
  loadGoogleDriveFile,
  loadGitHubFile,
  loadGitHubTree,
  loadNotionPage,
  loadOneDrive,
  loadPdf,
  loadS3,
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

  it('follows has_more/next_cursor, preserves block order, and passes start_cursor', async () => {
    const { fetch, calls } = makeFetch([
      [
        200,
        {
          results: [
            { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Page1' }] } },
            { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'first' }] } },
          ],
          has_more: true,
          next_cursor: 'cur-2',
        },
        'json',
      ],
      [
        200,
        {
          results: [
            { type: 'heading_2', heading_2: { rich_text: [{ plain_text: 'Page2' }] } },
            { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'second' }] } },
          ],
          has_more: false,
          next_cursor: null,
        },
        'json',
      ],
    ])
    const docs = await loadNotionPage('p1', { token: 't', fetch })
    expect(docs[0]!.content).toBe('# Page1\n\nfirst\n\n## Page2\n\nsecond')
    expect(calls).toHaveLength(2)
    expect(calls[0]).toBe('https://api.notion.com/v1/blocks/p1/children?page_size=100')
    expect(calls[1]).toContain('start_cursor=cur-2')
    expect(calls[1]).toContain('page_size=100')
  })

  it('throws AK_RAG_LOAD_FAILED on incomplete pagination (has_more without new cursor)', async () => {
    const { fetch } = makeFetch([
      [
        200,
        {
          results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'only' }] } }],
          has_more: true,
          next_cursor: null,
        },
        'json',
      ],
    ])
    await expect(loadNotionPage('p1', { token: 't', fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/incomplete pagination/),
    })
  })

  it('throws AK_RAG_LOAD_FAILED when next_cursor enters a cycle', async () => {
    const { fetch } = makeFetch([
      [
        200,
        {
          results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'a' }] } }],
          has_more: true,
          next_cursor: 'cursor-a',
        },
        'json',
      ],
      [
        200,
        {
          results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'b' }] } }],
          has_more: true,
          next_cursor: 'cursor-b',
        },
        'json',
      ],
      [
        200,
        {
          results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'c' }] } }],
          has_more: true,
          next_cursor: 'cursor-a',
        },
        'json',
      ],
    ])
    await expect(loadNotionPage('p1', { token: 't', fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/incomplete pagination/),
    })
  })

  it('forwards signal and maps abort to AK_RAG_LOAD_FAILED', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal)
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    await expect(
      loadNotionPage('p1', { token: 't', fetch, signal: controller.signal }),
    ).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/aborted/),
    })
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

describe('loadS3', () => {
  it('fails at invocation time when universal runtimes omit command injection', async () => {
    const send = vi.fn()
    await expect(loadS3({ client: { send }, bucket: 'bk' })).rejects.toMatchObject({
      code: 'AK_RAG_PEER_MISSING',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('paginates and stops at maxFiles', async () => {
    let listCall = 0
    const client = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if ('Bucket' in cmd.input && !('Key' in cmd.input)) {
          listCall++
          if (listCall === 1) {
            return {
              Contents: [{ Key: 'a.txt' }, { Key: 'b.txt' }],
              IsTruncated: true,
              NextContinuationToken: 'tok-2',
            }
          }
          return { Contents: [{ Key: 'c.txt' }], IsTruncated: false }
        }
        return { Body: { transformToString: async () => `body:${cmd.input.Key}` } }
      }),
    }
    class ListCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }
    class GetCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }
    const docs = await loadS3({
      client,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
      maxFiles: 2,
    })
    expect(docs).toHaveLength(2)
    expect(docs[0]!.source).toBe('s3://bk/a.txt')
  })

  it('walks pages until not truncated', async () => {
    let listCall = 0
    const client = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if ('Bucket' in cmd.input && !('Key' in cmd.input)) {
          listCall++
          if (listCall === 1) return { Contents: [{ Key: 'a' }], IsTruncated: true, NextContinuationToken: 't' }
          return { Contents: [{ Key: 'b' }], IsTruncated: false }
        }
        return { Body: { transformToString: async () => 'x' } }
      }),
    }
    class ListCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }
    class GetCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }
    const docs = await loadS3({
      client, bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })
    expect(docs.map(d => d.metadata?.key)).toEqual(['a', 'b'])
  })
})

describe('loadGcs', () => {
  it('follows nextPageToken', async () => {
    const { fetch } = makeFetch([
      [200, { items: [{ name: 'a' }], nextPageToken: 'p2' }, 'json'],
      [200, 'a-body', 'text'],
      [200, { items: [{ name: 'b' }] }, 'json'],
      [200, 'b-body', 'text'],
    ])
    const docs = await loadGcs({ bucket: 'bk', accessToken: 't', fetch })
    expect(docs.map(d => d.metadata?.name)).toEqual(['a', 'b'])
  })
})

describe('loadDropbox', () => {
  it('follows cursor when has_more', async () => {
    const { fetch } = makeFetch([
      [200, { entries: [{ '.tag': 'file', path_display: '/a.txt' }], has_more: true, cursor: 'c1' }, 'json'],
      [200, 'a-body', 'text'],
      [200, { entries: [{ '.tag': 'file', path_display: '/b.txt' }], has_more: false }, 'json'],
      [200, 'b-body', 'text'],
    ])
    const docs = await loadDropbox({ accessToken: 't', fetch })
    expect(docs.map(d => d.metadata?.path)).toEqual(['/a.txt', '/b.txt'])
  })
})

describe('loadOneDrive', () => {
  it('recurses into folders', async () => {
    const { fetch } = makeFetch([
      [200, { value: [{ id: 'fold', name: 'f', folder: {} }] }, 'json'],
      [200, { value: [{ id: 'f1', name: 'a.txt', file: { mimeType: 'text/plain' }, '@microsoft.graph.downloadUrl': 'https://dl/a' }] }, 'json'],
      [200, 'a-body', 'text'],
    ])
    const docs = await loadOneDrive({ accessToken: 't', fetch })
    expect(docs[0]!.metadata?.name).toBe('a.txt')
  })
})
