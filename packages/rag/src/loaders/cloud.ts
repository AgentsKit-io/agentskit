import type { InputDocument } from '../types'
import {
  type LoaderOptions,
  doFetch,
  ensureNotAborted,
  finishTreeLoad,
  loadFailed,
  readResponseJson,
  readResponseText,
  resolveMaxFiles,
  rethrowIfAbort,
} from './shared'

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
  const maxFiles = resolveMaxFiles(options.maxFiles)
  if (maxFiles === 0) return []
  const getToken = async () =>
    typeof options.accessToken === 'string' ? options.accessToken : await options.accessToken()

  let attempted = 0
  let loaded = 0
  let pageToken: string | undefined
  outer: while (true) {
    ensureNotAborted(options.signal, 'loadGcs')
    const params = new URLSearchParams()
    if (options.prefix) params.set('prefix', options.prefix)
    if (pageToken) params.set('pageToken', pageToken)
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(options.bucket)}/o?${params.toString()}`
    const response = await doFetch(fetchImpl, url, {
      headers: { authorization: `Bearer ${await getToken()}` },
      signal: options.signal,
    }, 'loadGcs')
    if (!response.ok) throw loadFailed(`loadGcs ${response.status}: ${url}`)
    const data = await readResponseJson<{
      items?: Array<{ name: string }>
      nextPageToken?: string
    }>(response, 'loadGcs')
    for (const item of data.items ?? []) {
      ensureNotAborted(options.signal, 'loadGcs')
      if (options.filter && !options.filter(item.name)) continue
      const objUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(options.bucket)}/o/${encodeURIComponent(item.name)}?alt=media`
      attempted++
      try {
        const objResponse = await doFetch(fetchImpl, objUrl, {
          headers: { authorization: `Bearer ${await getToken()}` },
          signal: options.signal,
        }, 'loadGcs')
        if (!objResponse.ok) continue
        docs.push({
          content: await readResponseText(objResponse, 'loadGcs'),
          source: `gs://${options.bucket}/${item.name}`,
          metadata: { bucket: options.bucket, name: item.name },
        })
        loaded++
      } catch (err) {
        rethrowIfAbort(err, options.signal, 'loadGcs')
      }
      if (docs.length >= maxFiles) break outer
    }
    const next = data.nextPageToken
    if (!next) break
    if (next === pageToken) {
      throw loadFailed('loadGcs: incomplete pagination (no new page token)')
    }
    pageToken = next
  }
  return finishTreeLoad('loadGcs', attempted, loaded, docs)
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
  const maxFiles = resolveMaxFiles(options.maxFiles)
  if (maxFiles === 0) return []
  const headers = { authorization: `Bearer ${options.accessToken}`, 'content-type': 'application/json' }

  let attempted = 0
  let loaded = 0
  let cursor: string | undefined
  outer: while (true) {
    ensureNotAborted(options.signal, 'loadDropbox')
    const url = cursor
      ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
      : 'https://api.dropboxapi.com/2/files/list_folder'
    const body = cursor ? { cursor } : { path: options.path ?? '', recursive: true }
    const response = await doFetch(fetchImpl, url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    }, 'loadDropbox')
    if (!response.ok) throw loadFailed(`loadDropbox ${response.status}: ${url}`)
    const data = await readResponseJson<{
      entries?: Array<{ '.tag': string; path_lower?: string; path_display?: string }>
      cursor?: string
      has_more?: boolean
    }>(response, 'loadDropbox')
    for (const entry of data.entries ?? []) {
      ensureNotAborted(options.signal, 'loadDropbox')
      if (entry['.tag'] !== 'file') continue
      const path = entry.path_display ?? entry.path_lower
      if (!path) continue
      if (options.filter && !options.filter(path)) continue
      attempted++
      try {
        const downloadResponse = await doFetch(fetchImpl, 'https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path }),
          },
          signal: options.signal,
        }, 'loadDropbox')
        if (!downloadResponse.ok) continue
        docs.push({
          content: await readResponseText(downloadResponse, 'loadDropbox'),
          source: `dropbox:${path}`,
          metadata: { path },
        })
        loaded++
      } catch (err) {
        rethrowIfAbort(err, options.signal, 'loadDropbox')
      }
      if (docs.length >= maxFiles) break outer
    }
    if (!data.has_more) break
    const next = data.cursor
    if (!next || next === cursor) {
      throw loadFailed('loadDropbox: incomplete pagination (has_more without a new cursor)')
    }
    cursor = next
  }
  return finishTreeLoad('loadDropbox', attempted, loaded, docs)
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
  const maxFiles = resolveMaxFiles(options.maxFiles)
  if (maxFiles === 0) return []
  const driveBase = options.driveId
    ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(options.driveId)}`
    : `https://graph.microsoft.com/v1.0/me/drive`
  const folder = options.folderItemId ? `items/${options.folderItemId}` : 'root'

  const getToken = async () =>
    typeof options.accessToken === 'string' ? options.accessToken : await options.accessToken()

  const visitedFolders = new Set<string>()
  let attempted = 0
  let loaded = 0

  async function walk(prefix: string): Promise<void> {
    if (docs.length >= maxFiles) return
    if (visitedFolders.has(prefix)) return
    visitedFolders.add(prefix)

    let url: string | undefined = `${driveBase}/${prefix}/children`
    const seenLinks = new Set<string>()

    while (url) {
      ensureNotAborted(options.signal, 'loadOneDrive')
      if (docs.length >= maxFiles) return
      if (seenLinks.has(url)) {
        throw loadFailed('loadOneDrive: incomplete pagination (repeated @odata.nextLink)')
      }
      seenLinks.add(url)

      const response = await doFetch(fetchImpl, url, {
        headers: { authorization: `Bearer ${await getToken()}` },
        signal: options.signal,
      }, 'loadOneDrive')
      if (!response.ok) throw loadFailed(`loadOneDrive ${response.status}: ${url}`)
      const data = await readResponseJson<{
        value?: Array<{
          id: string
          name: string
          folder?: object
          file?: { mimeType: string }
          '@microsoft.graph.downloadUrl'?: string
        }>
        '@odata.nextLink'?: string
      }>(response, 'loadOneDrive')

      for (const item of data.value ?? []) {
        ensureNotAborted(options.signal, 'loadOneDrive')
        if (docs.length >= maxFiles) return
        if (item.folder) {
          await walk(`items/${item.id}`)
          continue
        }
        if (!item.file) continue
        if (options.filter && !options.filter(item.name)) continue
        const downloadUrl = item['@microsoft.graph.downloadUrl']
        if (!downloadUrl) continue

        attempted++
        try {
          const fileResponse = await doFetch(fetchImpl, downloadUrl, { signal: options.signal }, 'loadOneDrive')
          if (!fileResponse.ok) continue
          docs.push({
            content: await readResponseText(fileResponse, 'loadOneDrive'),
            source: `onedrive:${item.id}`,
            metadata: { id: item.id, name: item.name, mimeType: item.file.mimeType },
          })
          loaded++
        } catch (err) {
          rethrowIfAbort(err, options.signal, 'loadOneDrive')
        }
      }

      const next = data['@odata.nextLink']
      if (!next) {
        url = undefined
        continue
      }
      if (seenLinks.has(next) || next === url) {
        throw loadFailed('loadOneDrive: incomplete pagination (repeated @odata.nextLink)')
      }
      url = next
    }
  }

  await walk(folder)
  return finishTreeLoad('loadOneDrive', attempted, loaded, docs)
}
