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

/** Options for fetching and converting a URL into a document. */
export interface UrlLoaderOptions extends LoaderOptions {
  headers?: Record<string, string>
  /** Explicit egress allowlist for arbitrary URLs. Required for loadUrl. */
  allowedOrigins?: readonly string[]
}

function assertAllowedUrl(url: string, options: UrlLoaderOptions): void {
  let origin: string
  try { origin = new URL(url).origin } catch { throw loadFailed('loadUrl: invalid URL') }
  if (new URL(url).protocol !== 'https:') throw loadFailed('loadUrl: only HTTPS URLs are allowed')
  if (!options.allowedOrigins?.includes(origin)) {
    throw loadFailed(`loadUrl: origin ${origin} is not in allowedOrigins`)
  }
}

/** Fetches a URL and returns its supported content as one or more documents.
 * @param url URL to fetch.
 * @param options Origin allowlist, fetch, timeout, and content-size limits.
 * @returns Documents extracted from the response.
 * @throws {RagError} When fetching, reading, or parsing the response fails.
 * @example
 * ```ts
 * const [document] = await loadUrl('https://example.com/guide', {
 *   allowedOrigins: ['https://example.com'],
 * })
 * ```
 */
export async function loadUrl(url: string, options: UrlLoaderOptions = {}): Promise<InputDocument[]> {
  assertAllowedUrl(url, options)
  const fetchImpl = options.fetch ?? globalThis.fetch
  const response = await doFetch(fetchImpl, url, {
    headers: options.headers,
    signal: options.signal,
    redirect: 'error',
  }, 'loadUrl', options)
  if (!response.ok) throw loadFailed(`loadUrl ${response.status}: ${url}`)
  const content = await readResponseText(response, 'loadUrl', options.maxResponseBytes, options.timeoutMs, options.signal)
  return [{ content, source: url, metadata: { url } }]
}

/** Options for loading a file from a GitHub repository. */
export interface GitHubLoaderOptions extends LoaderOptions {
  token?: string
  /** Branch / tag / sha. Default 'HEAD'. */
  ref?: string
}

/** Loads one GitHub file as a document.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param path Repository-relative file path.
 * @param options GitHub credentials and loader limits.
 * @returns The loaded file as a document.
 * @throws {RagError} When the request or response parsing fails.
 */
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
  const response = await doFetch(fetchImpl, url, { headers, signal: options.signal }, 'loadGitHubFile', options)
  if (!response.ok) throw loadFailed(`loadGitHubFile ${response.status}: ${url}`)
  return [
    {
      content: await readResponseText(response, 'loadGitHubFile', options.maxResponseBytes, options.timeoutMs, options.signal),
      source: url,
      metadata: { owner, repo, path, ref },
    },
  ]
}

/** Options for loading eligible files from a GitHub repository tree. */
export interface GitHubTreeOptions extends GitHubLoaderOptions {
  /** Only include files matching this regex / test. */
  filter?: (path: string) => boolean
  /** Max files to load. Default 100. */
  maxFiles?: number
}

/** Loads matching files from a GitHub repository tree.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param options Repository, filtering, credentials, and loader limits.
 * @returns Successfully loaded documents; fails if every eligible download fails.
 * @throws {RagError} When listing fails or all eligible downloads fail.
 */
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
  const response = await doFetch(fetchImpl, url, { headers, signal: options.signal }, 'loadGitHubTree', options)
  if (!response.ok) throw loadFailed(`loadGitHubTree ${response.status}: ${url}`)
  const tree = await readResponseJson<{ tree?: Array<{ path: string; type: string }> }>(
    response,
    'loadGitHubTree',
    options.maxResponseBytes,
    options.timeoutMs,
    options.signal,
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

/** Options for loading a Notion page and its child blocks. */
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

/** Loads supported text blocks from a Notion page, following child pagination.
 * @param pageId Notion page identifier.
 * @param options Page identifier, credentials, and loader limits.
 * @returns The page content as a document.
 * @throws {RagError} When loading or pagination fails.
 */
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
    }, 'loadNotionPage', options)
    if (!response.ok) throw loadFailed(`loadNotionPage ${response.status}: ${url}`)
    const data = await readResponseJson<NotionChildrenResponse>(response, 'loadNotionPage', options.maxResponseBytes, options.timeoutMs, options.signal)
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

/** Options for loading a Confluence page. */
export interface ConfluenceLoaderOptions extends LoaderOptions {
  baseUrl: string
  /** Basic auth token `<email:api-token>` in base64, OR pass `authorization` header directly. */
  token?: string
  authorization?: string
}

/** Loads a Confluence page as a document.
 * @param pageId Confluence page identifier.
 * @param options Page identifier, credentials, and loader limits.
 * @returns The page content as a document.
 * @throws {RagError} When the request or response parsing fails.
 */
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
  }, 'loadConfluencePage', options)
  if (!response.ok) throw loadFailed(`loadConfluencePage ${response.status}: ${url}`)
  const data = await readResponseJson<{ body?: { storage?: { value?: string } }; title?: string }>(
    response,
    'loadConfluencePage',
    options.maxResponseBytes,
    options.timeoutMs,
    options.signal,
  )
  const content = data.body?.storage?.value ?? ''
  return [{ content, source: `${options.baseUrl}/pages/${pageId}`, metadata: { pageId, title: data.title } }]
}

/** Options for loading a Google Drive file. */
export interface DriveLoaderOptions extends LoaderOptions {
  accessToken: string
}

/** Loads an exported Google Drive file as a document.
 * @param fileId Google Drive file identifier.
 * @param options File identifier, credentials, and loader limits.
 * @returns The file content as a document.
 * @throws {RagError} When the request or response parsing fails.
 */
export async function loadGoogleDriveFile(
  fileId: string,
  options: DriveLoaderOptions,
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
  const response = await doFetch(fetchImpl, url, {
    headers: { authorization: `Bearer ${options.accessToken}` },
    signal: options.signal,
  }, 'loadGoogleDriveFile', options)
  if (!response.ok) throw loadFailed(`loadGoogleDriveFile ${response.status}: ${url}`)
  const content = await readResponseText(response, 'loadGoogleDriveFile', options.maxResponseBytes, options.timeoutMs, options.signal)
  return [{ content, source: `gdrive://${fileId}`, metadata: { fileId } }]
}

/** Options for fetching and extracting text from a PDF. */
export interface PdfLoaderOptions extends LoaderOptions {
  parsePdf: (bytes: Uint8Array) => Promise<{ text: string; pages?: number }> | { text: string; pages?: number }
}

/** Fetches a PDF and extracts its text into a document.
 * @param url URL of the PDF.
 * @param options Fetch and loader limits.
 * @returns The extracted PDF document.
 * @throws {RagError} When fetching or parsing fails.
 */
export async function loadPdf(url: string, options: PdfLoaderOptions): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const response = await doFetch(fetchImpl, url, { signal: options.signal }, 'loadPdf', options)
  if (!response.ok) throw loadFailed(`loadPdf ${response.status}: ${url}`)
  const buf = new Uint8Array(await readResponseArrayBuffer(response, 'loadPdf', options.maxResponseBytes, options.timeoutMs, options.signal))
  try {
    const { text, pages } = await options.parsePdf(buf)
    return [{ content: text, source: url, metadata: { url, pages } }]
  } catch (cause) {
    throw loadFailed('loadPdf: parser failed', cause)
  }
}
