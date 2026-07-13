import { RagError, RagErrorCodes } from './errors'
import type { InputDocument } from './types'

/**
 * Document loaders: small async functions returning `InputDocument[]` ready to
 * pipe into `RAG.ingest`. Framework-agnostic; each accepts a custom `fetch`.
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadUrl ${response.status}: ${url}` })
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadGitHubFile ${response.status}: ${url}` })
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadGitHubTree ${response.status}: ${url}` })
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadNotionPage ${response.status}: ${url}` })
  const data = (await response.json()) as {
    results?: Array<{ type: string; paragraph?: { rich_text?: Array<{ plain_text?: string }> }; heading_1?: { rich_text?: Array<{ plain_text?: string }> }; heading_2?: { rich_text?: Array<{ plain_text?: string }> }; heading_3?: { rich_text?: Array<{ plain_text?: string }> } }>
  }
  const HEADING_PREFIX: Record<string, string> = { heading_1: '# ', heading_2: '## ', heading_3: '### ' }
  const text = (data.results ?? [])
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
  const response = await fetchImpl(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  })
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadConfluencePage ${response.status}: ${url}` })
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadGoogleDriveFile ${response.status}: ${url}` })
  const content = await response.text()
  return [{ content, source: `gdrive://${fileId}`, metadata: { fileId } }]
}

// ---------------------------------------------------------------------------
// S3 — Cloudflare R2 / MinIO / any S3-compatible bucket
// ---------------------------------------------------------------------------

export interface S3LikeClient {
  send(command: { input: Record<string, unknown> }): Promise<unknown>
}

export interface S3LoaderOptions extends LoaderOptions {
  /**
   * AWS SDK v3 \`S3Client\`-shaped client. Bring your own to keep the bundle
   * lean. Works with R2 / MinIO / etc. by configuring the client's endpoint.
   */
  client: S3LikeClient
  bucket: string
  /**
   * AWS SDK v3 commands. Pass them in to skip the dynamic import:
   * \`{ ListObjectsV2Command, GetObjectCommand }\` from \`@aws-sdk/client-s3\`.
   * Optional — when omitted the loader resolves them lazily.
   */
  commands?: {
    ListObjectsV2Command: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
    GetObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
  }
  /** Limit to keys under this prefix. */
  prefix?: string
  /** Include only keys matching this predicate after listing. */
  filter?: (key: string) => boolean
  /** Cap on number of objects to load. Default 100. */
  maxFiles?: number
}

interface S3SdkLike {
  ListObjectsV2Command: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
  GetObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
}

let cachedS3Sdk: Promise<S3SdkLike> | null = null
const importOptionalPeer = (moduleId: string): Promise<unknown> => import(/* @vite-ignore */ moduleId)
async function loadS3Sdk(): Promise<S3SdkLike> {
  if (!cachedS3Sdk) {
    cachedS3Sdk = (async () => {
      try {
        return (await importOptionalPeer('@aws-sdk/client-s3')) as S3SdkLike
      } catch {
        throw new RagError({ code: RagErrorCodes.AK_RAG_PEER_MISSING, message: 'Install @aws-sdk/client-s3 to use loadS3: npm install @aws-sdk/client-s3', hint: 'loadS3 uses the optional peer "@aws-sdk/client-s3".' })
      }
    })()
  }
  return cachedS3Sdk
}

export async function loadS3(options: S3LoaderOptions): Promise<InputDocument[]> {
  const { ListObjectsV2Command, GetObjectCommand } = options.commands ?? await loadS3Sdk()
  const docs: InputDocument[] = []
  let continuationToken: string | undefined
  const maxFiles = options.maxFiles ?? 100
  outer: while (true) {
    const list = await options.client.send(new ListObjectsV2Command({
      Bucket: options.bucket,
      Prefix: options.prefix,
      ContinuationToken: continuationToken,
    })) as {
      Contents?: Array<{ Key?: string }>
      NextContinuationToken?: string
      IsTruncated?: boolean
    }
    for (const obj of list.Contents ?? []) {
      const key = obj.Key
      if (!key) continue
      if (options.filter && !options.filter(key)) continue
      const get = await options.client.send(new GetObjectCommand({
        Bucket: options.bucket,
        Key: key,
      })) as { Body?: { transformToString(): Promise<string> } }
      const content = await get.Body?.transformToString() ?? ''
      docs.push({
        content,
        source: `s3://${options.bucket}/${key}`,
        metadata: { bucket: options.bucket, key },
      })
      if (docs.length >= maxFiles) break outer
    }
    if (!list.IsTruncated) break
    continuationToken = list.NextContinuationToken
  }
  return docs
}

// ---------------------------------------------------------------------------
// GCS — Google Cloud Storage
// ---------------------------------------------------------------------------

export interface GcsLoaderOptions extends LoaderOptions {
  bucket: string
  prefix?: string
  /** OAuth2 access token. Mint via google-auth-library or workload identity. */
  accessToken: string | (() => string | Promise<string>)
  filter?: (name: string) => boolean
  maxFiles?: number
}

export async function loadGcs(options: GcsLoaderOptions): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const docs: InputDocument[] = []
  const maxFiles = options.maxFiles ?? 100
  const getToken = async () =>
    typeof options.accessToken === 'string' ? options.accessToken : await options.accessToken()

  let pageToken: string | undefined
  outer: while (true) {
    const params = new URLSearchParams()
    if (options.prefix) params.set('prefix', options.prefix)
    if (pageToken) params.set('pageToken', pageToken)
    const url = `https://storage.googleapis.com/storage/v1/b/${options.bucket}/o?${params.toString()}`
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${await getToken()}` },
    })
    if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadGcs ${response.status}: ${url}` })
    const data = await response.json() as {
      items?: Array<{ name: string }>
      nextPageToken?: string
    }
    for (const item of data.items ?? []) {
      if (options.filter && !options.filter(item.name)) continue
      const objUrl = `https://storage.googleapis.com/storage/v1/b/${options.bucket}/o/${encodeURIComponent(item.name)}?alt=media`
      const objResponse = await fetchImpl(objUrl, {
        headers: { authorization: `Bearer ${await getToken()}` },
      })
      if (!objResponse.ok) continue
      docs.push({
        content: await objResponse.text(),
        source: `gs://${options.bucket}/${item.name}`,
        metadata: { bucket: options.bucket, name: item.name },
      })
      if (docs.length >= maxFiles) break outer
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return docs
}

// ---------------------------------------------------------------------------
// Dropbox
// ---------------------------------------------------------------------------

export interface DropboxLoaderOptions extends LoaderOptions {
  /** Dropbox OAuth2 access token. */
  accessToken: string
  /** Folder path, e.g. `/team-docs`. Empty string = root. */
  path?: string
  filter?: (path: string) => boolean
  maxFiles?: number
}

export async function loadDropbox(options: DropboxLoaderOptions): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const docs: InputDocument[] = []
  const maxFiles = options.maxFiles ?? 100
  const headers = { authorization: `Bearer ${options.accessToken}`, 'content-type': 'application/json' }

  let cursor: string | undefined
  outer: while (true) {
    const url = cursor
      ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
      : 'https://api.dropboxapi.com/2/files/list_folder'
    const body = cursor ? { cursor } : { path: options.path ?? '', recursive: true }
    const response = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadDropbox ${response.status}: ${url}` })
    const data = await response.json() as {
      entries?: Array<{ '.tag': string; path_lower?: string; path_display?: string }>
      cursor?: string
      has_more?: boolean
    }
    for (const entry of data.entries ?? []) {
      if (entry['.tag'] !== 'file') continue
      const path = entry.path_display ?? entry.path_lower
      if (!path) continue
      if (options.filter && !options.filter(path)) continue
      const downloadResponse = await fetchImpl('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path }),
        },
      })
      if (!downloadResponse.ok) continue
      docs.push({
        content: await downloadResponse.text(),
        source: `dropbox:${path}`,
        metadata: { path },
      })
      if (docs.length >= maxFiles) break outer
    }
    if (!data.has_more) break
    cursor = data.cursor
  }
  return docs
}

// ---------------------------------------------------------------------------
// OneDrive — Microsoft Graph
// ---------------------------------------------------------------------------

export interface OneDriveLoaderOptions extends LoaderOptions {
  /** Microsoft Graph access token (mint via MSAL). */
  accessToken: string | (() => string | Promise<string>)
  /** Drive id. Defaults to `me/drive` (the signed-in user's OneDrive). */
  driveId?: string
  /** Item id (folder) to walk. Defaults to root. */
  folderItemId?: string
  filter?: (name: string) => boolean
  maxFiles?: number
}

export async function loadOneDrive(options: OneDriveLoaderOptions): Promise<InputDocument[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const docs: InputDocument[] = []
  const maxFiles = options.maxFiles ?? 100
  const driveBase = options.driveId
    ? `https://graph.microsoft.com/v1.0/drives/${options.driveId}`
    : `https://graph.microsoft.com/v1.0/me/drive`
  const folder = options.folderItemId ? `items/${options.folderItemId}` : 'root'

  const getToken = async () =>
    typeof options.accessToken === 'string' ? options.accessToken : await options.accessToken()

  async function walk(prefix: string): Promise<void> {
    const url = `${driveBase}/${prefix}/children`
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${await getToken()}` },
    })
    if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadOneDrive ${response.status}: ${url}` })
    const data = await response.json() as {
      value?: Array<{ id: string; name: string; folder?: object; file?: { mimeType: string }; '@microsoft.graph.downloadUrl'?: string }>
    }
    for (const item of data.value ?? []) {
      if (docs.length >= maxFiles) return
      if (item.folder) {
        await walk(`items/${item.id}`)
        continue
      }
      if (!item.file) continue
      if (options.filter && !options.filter(item.name)) continue
      const downloadUrl = item['@microsoft.graph.downloadUrl']
      if (!downloadUrl) continue
      const fileResponse = await fetchImpl(downloadUrl)
      if (!fileResponse.ok) continue
      docs.push({
        content: await fileResponse.text(),
        source: `onedrive:${item.id}`,
        metadata: { id: item.id, name: item.name, mimeType: item.file.mimeType },
      })
    }
  }

  await walk(folder)
  return docs
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
  if (!response.ok) throw new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: `loadPdf ${response.status}: ${url}` })
  const buf = new Uint8Array(await response.arrayBuffer())
  const { text, pages } = await options.parsePdf(buf)
  return [{ content: text, source: url, metadata: { url, pages } }]
}
