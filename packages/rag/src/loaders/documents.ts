import type { InputDocument } from '../types'
import {
  type LoaderOptions,
  doFetch,
  encodePathSegments,
  ensureNotAborted,
  finishTreeLoad,
  loadFailed,
  readResponseArrayBuffer,
  readResponseJson,
  readResponseText,
  resolveMaxFiles,
  rethrowIfAbort,
} from './shared'

export interface UrlLoaderOptions extends LoaderOptions {
  headers?: Record<string, string>
}

export async function loadUrl(url: string, options: UrlLoaderOptions = {}): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const response = await doFetch(fetchImpl, url, { headers: options.headers, signal: options.signal }, 'loadUrl')
  if (!response.ok) throw loadFailed(`loadUrl ${response.status}: ${url}`)
  const content = await readResponseText(response, 'loadUrl')
  return [{ content, source: url, metadata: { url } }]
}

export interface GitHubLoaderOptions extends LoaderOptions {
  token?: string
  /** Branch / tag / sha. Default 'HEAD'. */
  ref?: string
}

export async function loadGitHubFile(
  owner: string,
  repo: string,
  path: string,
  options: GitHubLoaderOptions = {},
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const ref = options.ref ?? 'HEAD'
  const encodedPath = encodePathSegments(path)
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${encodedPath}`
  const headers: Record<string, string> = {}
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await doFetch(fetchImpl, url, { headers, signal: options.signal }, 'loadGitHubFile')
  if (!response.ok) throw loadFailed(`loadGitHubFile ${response.status}: ${url}`)
  return [
    {
      content: await readResponseText(response, 'loadGitHubFile'),
      source: url,
      metadata: { owner, repo, path, ref },
    },
  ]
}

export interface GitHubTreeOptions extends GitHubLoaderOptions {
  /** Only include files matching this regex / test. */
  filter?: (path: string) => boolean
  /** Max files to load. Default 100. */
  maxFiles?: number
}

export async function loadGitHubTree(
  owner: string,
  repo: string,
  options: GitHubTreeOptions = {},
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const ref = options.ref ?? 'HEAD'
  const maxFiles = resolveMaxFiles(options.maxFiles)
  if (maxFiles === 0) return []

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' }
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await doFetch(fetchImpl, url, { headers, signal: options.signal }, 'loadGitHubTree')
  if (!response.ok) throw loadFailed(`loadGitHubTree ${response.status}: ${url}`)
  const tree = await readResponseJson<{ tree?: Array<{ path: string; type: string }> }>(
    response,
    'loadGitHubTree',
  )
  const files = (tree.tree ?? [])
    .filter(t => t.type === 'blob')
    .filter(t => !options.filter || options.filter(t.path))
    .slice(0, maxFiles)

  const docs: InputDocument[] = []
  let attempted = 0
  let loaded = 0
  for (const file of files) {
    ensureNotAborted(options.signal, 'loadGitHubTree')
    attempted++
    try {
      const items = await loadGitHubFile(owner, repo, file.path, options)
      docs.push(...items)
      loaded++
    } catch (err) {
      rethrowIfAbort(err, options.signal, 'loadGitHubTree')
    }
  }
  return finishTreeLoad('loadGitHubTree', attempted, loaded, docs)
}

export interface NotionLoaderOptions extends LoaderOptions {
  token: string
  version?: string
}

type NotionRichText = Array<{ plain_text?: string }>
type NotionBlock = {
  type: string
  paragraph?: { rich_text?: NotionRichText }
  heading_1?: { rich_text?: NotionRichText }
  heading_2?: { rich_text?: NotionRichText }
  heading_3?: { rich_text?: NotionRichText }
}
type NotionChildrenResponse = {
  results?: NotionBlock[]
  has_more?: boolean
  next_cursor?: string | null
}

export async function loadNotionPage(
  pageId: string,
  options: NotionLoaderOptions,
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const HEADING_PREFIX: Record<string, string> = { heading_1: '# ', heading_2: '## ', heading_3: '### ' }
  const blocks: NotionBlock[] = []
  let cursor: string | undefined
  const seenCursors = new Set<string>()

  while (true) {
    ensureNotAborted(options.signal, 'loadNotionPage')
    let url = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`
    if (cursor) url += `&start_cursor=${encodeURIComponent(cursor)}`
    const response = await doFetch(fetchImpl, url, {
      headers: {
        authorization: `Bearer ${options.token}`,
        'notion-version': options.version ?? '2022-06-28',
      },
      signal: options.signal,
    }, 'loadNotionPage')
    if (!response.ok) throw loadFailed(`loadNotionPage ${response.status}: ${url}`)
    const data = await readResponseJson<NotionChildrenResponse>(response, 'loadNotionPage')
    for (const block of data.results ?? []) {
      blocks.push(block)
    }
    if (!data.has_more) break
    const next = data.next_cursor
    if (typeof next !== 'string' || next.length === 0 || seenCursors.has(next)) {
      throw loadFailed('loadNotionPage: incomplete pagination (has_more without a new cursor)')
    }
    seenCursors.add(next)
    cursor = next
  }

  const text = blocks
    .map(block => {
      const part =
        block.paragraph?.rich_text ??
        block.heading_1?.rich_text ??
        block.heading_2?.rich_text ??
        block.heading_3?.rich_text
      if (!part) return ''
      const prefix = HEADING_PREFIX[block.type] ?? ''
      return prefix + part.map(t => t.plain_text ?? '').join('')
    })
    .filter(Boolean)
    .join('\n\n')
  return [{ content: text, source: `notion://${pageId}`, metadata: { pageId } }]
}

export interface ConfluenceLoaderOptions extends LoaderOptions {
  baseUrl: string
  /** Basic auth token `<email:api-token>` in base64, OR pass `authorization` header directly. */
  token?: string
  authorization?: string
}

export async function loadConfluencePage(
  pageId: string,
  options: ConfluenceLoaderOptions,
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const url = `${options.baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`
  const authHeader = options.authorization ?? (options.token ? `Basic ${options.token}` : undefined)
  const response = await doFetch(fetchImpl, url, {
    headers: authHeader ? { authorization: authHeader } : {},
    signal: options.signal,
  }, 'loadConfluencePage')
  if (!response.ok) throw loadFailed(`loadConfluencePage ${response.status}: ${url}`)
  const data = await readResponseJson<{ body?: { storage?: { value?: string } }; title?: string }>(
    response,
    'loadConfluencePage',
  )
  const content = data.body?.storage?.value ?? ''
  return [{ content, source: `${options.baseUrl}/pages/${pageId}`, metadata: { pageId, title: data.title } }]
}

export interface DriveLoaderOptions extends LoaderOptions {
  accessToken: string
}

export async function loadGoogleDriveFile(
  fileId: string,
  options: DriveLoaderOptions,
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
  const response = await doFetch(fetchImpl, url, {
    headers: { authorization: `Bearer ${options.accessToken}` },
    signal: options.signal,
  }, 'loadGoogleDriveFile')
  if (!response.ok) throw loadFailed(`loadGoogleDriveFile ${response.status}: ${url}`)
  const content = await readResponseText(response, 'loadGoogleDriveFile')
  return [{ content, source: `gdrive://${fileId}`, metadata: { fileId } }]
}

export interface PdfLoaderOptions extends LoaderOptions {
  parsePdf: (bytes: Uint8Array) => Promise<{ text: string; pages?: number }> | { text: string; pages?: number }
}

/**
 * PDF loader — parser is BYO so native deps stay out of the bundle.
 * Fetch bytes at `url`, hand to `parsePdf`, wrap in `InputDocument`.
 */
export async function loadPdf(url: string, options: PdfLoaderOptions): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const response = await doFetch(fetchImpl, url, { signal: options.signal }, 'loadPdf')
  if (!response.ok) throw loadFailed(`loadPdf ${response.status}: ${url}`)
  const buf = new Uint8Array(await readResponseArrayBuffer(response, 'loadPdf'))
  const { text, pages } = await options.parsePdf(buf)
  return [{ content: text, source: url, metadata: { url, pages } }]
}
