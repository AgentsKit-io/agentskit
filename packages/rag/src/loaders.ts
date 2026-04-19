import type { InputDocument } from './types'

/**
 * Document loaders: small async functions that return
 * `InputDocument[]` ready to pipe into `RAG.ingest`. Every loader
 * is framework-agnostic and accepts a custom `fetch` for tests.
 */

export interface LoaderOptions {
  fetch?: typeof globalThis.fetch
}

export interface UrlLoaderOptions extends LoaderOptions {
  headers?: Record<string, string>
}

export async function loadUrl(url: string, options: UrlLoaderOptions = {}): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const response = await fetchImpl(url, { headers: options.headers })
  if (!response.ok) throw new Error(`loadUrl ${response.status}: ${url}`)
  const content = await response.text()
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
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`
  const headers: Record<string, string> = {}
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await fetchImpl(url, { headers })
  if (!response.ok) throw new Error(`loadGitHubFile ${response.status}: ${url}`)
  return [
    {
      content: await response.text(),
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
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' }
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await fetchImpl(url, { headers })
  if (!response.ok) throw new Error(`loadGitHubTree ${response.status}: ${url}`)
  const tree = (await response.json()) as { tree?: Array<{ path: string; type: string }> }
  const files = (tree.tree ?? [])
    .filter(t => t.type === 'blob')
    .filter(t => !options.filter || options.filter(t.path))
    .slice(0, options.maxFiles ?? 100)
  const docs: InputDocument[] = []
  for (const file of files) {
    const items = await loadGitHubFile(owner, repo, file.path, options)
    docs.push(...items)
  }
  return docs
}

export interface NotionLoaderOptions extends LoaderOptions {
  token: string
  version?: string
}

export async function loadNotionPage(
  pageId: string,
  options: NotionLoaderOptions,
): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const url = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`
  const response = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${options.token}`,
      'notion-version': options.version ?? '2022-06-28',
    },
  })
  if (!response.ok) throw new Error(`loadNotionPage ${response.status}: ${url}`)
  const data = (await response.json()) as {
    results?: Array<{ type: string; paragraph?: { rich_text?: Array<{ plain_text?: string }> }; heading_1?: { rich_text?: Array<{ plain_text?: string }> }; heading_2?: { rich_text?: Array<{ plain_text?: string }> }; heading_3?: { rich_text?: Array<{ plain_text?: string }> } }>
  }
  const text = (data.results ?? [])
    .map(block => {
      const part =
        block.paragraph?.rich_text ??
        block.heading_1?.rich_text ??
        block.heading_2?.rich_text ??
        block.heading_3?.rich_text
      if (!part) return ''
      const prefix = block.type === 'heading_1' ? '# ' : block.type === 'heading_2' ? '## ' : block.type === 'heading_3' ? '### ' : ''
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
  const response = await fetchImpl(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  })
  if (!response.ok) throw new Error(`loadConfluencePage ${response.status}: ${url}`)
  const data = (await response.json()) as { body?: { storage?: { value?: string } }; title?: string }
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
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${options.accessToken}` },
  })
  if (!response.ok) throw new Error(`loadGoogleDriveFile ${response.status}: ${url}`)
  const content = await response.text()
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
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`loadPdf ${response.status}: ${url}`)
  const buf = new Uint8Array(await response.arrayBuffer())
  const { text, pages } = await options.parsePdf(buf)
  return [{ content: text, source: url, metadata: { url, pages } }]
}
