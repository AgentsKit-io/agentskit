import { RagError, RagErrorCodes } from '../errors'
import type { InputDocument } from '../types'
import {
  type LoaderOptions,
  ensureNotAborted,
  finishTreeLoad,
  isAbortLike,
  loadFailed,
  readS3Body,
  resolveMaxFiles,
  rethrowIfAbort,
} from './shared'

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
   * Optional in Node, where the loader resolves them lazily.
   * Required in browser, Expo/Metro, and React Native universal bundles.
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

export async function loadS3(options: S3LoaderOptions): Promise<InputDocument[]> {
  if (!options.commands) {
    throw new RagError({
      code: RagErrorCodes.AK_RAG_PEER_MISSING,
      message: 'Pass S3 command constructors through loadS3({ commands }) in browser, Expo/Metro, and React Native runtimes.',
      hint: 'Universal bundles do not resolve the optional "@aws-sdk/client-s3" peer automatically.',
    })
  }
  const maxFiles = resolveMaxFiles(options.maxFiles)
  if (maxFiles === 0) return []

  const { ListObjectsV2Command, GetObjectCommand } = options.commands
  const docs: InputDocument[] = []
  let attempted = 0
  let loaded = 0
  let continuationToken: string | undefined
  outer: while (true) {
    ensureNotAborted(options.signal, 'loadS3')
    let list: {
      Contents?: Array<{ Key?: string }>
      NextContinuationToken?: string
      IsTruncated?: boolean
    }
    try {
      list = await options.client.send(new ListObjectsV2Command({
        Bucket: options.bucket,
        Prefix: options.prefix,
        ContinuationToken: continuationToken,
      })) as typeof list
    } catch (cause) {
      if (cause instanceof RagError) throw cause
      if (isAbortLike(cause)) throw loadFailed('loadS3: aborted', cause)
      throw loadFailed(`loadS3: list failed for s3://${options.bucket}`, cause)
    }
    for (const obj of list.Contents ?? []) {
      ensureNotAborted(options.signal, 'loadS3')
      const key = obj.Key
      if (!key) continue
      if (options.filter && !options.filter(key)) continue
      attempted++
      try {
        const get = await options.client.send(new GetObjectCommand({
          Bucket: options.bucket,
          Key: key,
        })) as { Body?: { transformToString?: () => Promise<string> } }
        const content = await readS3Body(get.Body, 'loadS3')
        docs.push({
          content,
          source: `s3://${options.bucket}/${key}`,
          metadata: { bucket: options.bucket, key },
        })
        loaded++
      } catch (err) {
        rethrowIfAbort(err, options.signal, 'loadS3')
      }
      if (docs.length >= maxFiles) break outer
    }
    if (!list.IsTruncated) break
    const next = list.NextContinuationToken
    if (!next || next === continuationToken) {
      throw loadFailed('loadS3: incomplete pagination (truncated without a new continuation token)')
    }
    continuationToken = next
  }
  return finishTreeLoad('loadS3', attempted, loaded, docs)
}
