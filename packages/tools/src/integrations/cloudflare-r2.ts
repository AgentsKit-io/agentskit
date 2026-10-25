import { ErrorCodes, ToolError, defineTool } from '@agentskit/core'

/**
 * Cloudflare R2 storage. R2 is S3-compatible at the protocol level, so the
 * agent sees the same shape (`r2_put`, `r2_get`, `r2_list`, `r2_delete`,
 * `r2_signed_url`). Auth is via an injected `client` that mirrors the
 * `@aws-sdk/client-s3` surface — we don't bundle a driver.
 */

/** Minimal `GetObjectCommand` result fields used by the R2 tools. */
export interface R2GetObjectOutput {
  Body?: { transformToString(): Promise<string> }
  ContentType?: string
}

/** Input fields sent to an R2 `PutObjectCommand`. */
export interface R2PutObjectInput {
  Bucket: string
  Key: string
  Body: string
  ContentType?: string
}

/** Minimal `ListObjectsV2Command` result fields used by the R2 tools. */
export interface R2ListObjectsOutput {
  Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date | string }>
  IsTruncated?: boolean
  NextContinuationToken?: string
}

/** S3 SDK client surface required by the Cloudflare R2 tools. */
export interface R2ClientLike {
  send(command: { input: Record<string, unknown> }): Promise<unknown>
}

/** Client, bucket, and optional URL signer for Cloudflare R2 tools. */
export interface CloudflareR2Config {
  client: R2ClientLike
  bucket: string
  /**
   * Async signer for `r2_signed_url`. Wire `getSignedUrl` from
   * `@aws-sdk/s3-request-presigner` here — we don't take it as a hard dep.
   */
  signGetUrl?: (input: { Bucket: string; Key: string; expiresIn: number }) => Promise<string>
}

interface CommandClasses {
  GetObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
  PutObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
  ListObjectsV2Command: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
  DeleteObjectCommand: new (input: Record<string, unknown>) => { input: Record<string, unknown> }
}

let cachedSdk: Promise<CommandClasses> | null = null
async function loadSdk(): Promise<CommandClasses> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        const moduleId = '@aws-sdk/client-s3'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as CommandClasses
      } catch {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_PEER_MISSING,
          message: 'Install @aws-sdk/client-s3 to use cloudflareR2: npm install @aws-sdk/client-s3',
          hint: 'cloudflareR2 reuses the S3-compatible @aws-sdk/client-s3 driver as an optional peer.',
        })
      }
    })()
  }
  return cachedSdk
}

/** Create a tool that reads an object body from the configured R2 bucket.
 *
 * @param config R2 client and bucket.
 * @returns An R2 object read tool. */
export function cloudflareR2Get(config: CloudflareR2Config) {
  return defineTool({
    name: 'r2_get',
    description: 'Read an object from Cloudflare R2 by key.',
    schema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    } as const,
    async execute({ key }) {
      const { GetObjectCommand } = await loadSdk()
      const out = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: String(key) })) as R2GetObjectOutput
      const body = await out.Body?.transformToString()
      return { key, contentType: out.ContentType, body }
    },
  })
}

/** Create a tool that writes a text object to the configured R2 bucket.
 *
 * @param config R2 client and bucket.
 * @returns An R2 object write tool. */
export function cloudflareR2Put(config: CloudflareR2Config) {
  return defineTool({
    name: 'r2_put',
    description: 'Write an object to Cloudflare R2.',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        body: { type: 'string' },
        contentType: { type: 'string' },
      },
      required: ['key', 'body'],
    } as const,
    async execute({ key, body, contentType }) {
      const { PutObjectCommand } = await loadSdk()
      await config.client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: String(key),
        Body: String(body),
        ContentType: contentType ? String(contentType) : undefined,
      }))
      return { key, ok: true }
    },
  })
}

/** Create a tool that lists object keys in the configured R2 bucket.
 *
 * @param config R2 client and bucket.
 * @returns An R2 object listing tool. */
export function cloudflareR2List(config: CloudflareR2Config) {
  return defineTool({
    name: 'r2_list',
    description: 'List object keys in the configured R2 bucket.',
    schema: {
      type: 'object',
      properties: {
        prefix: { type: 'string' },
        continuationToken: { type: 'string' },
        maxKeys: { type: 'number', description: 'Cap on returned keys, default 100.' },
      },
    } as const,
    async execute({ prefix, continuationToken, maxKeys }) {
      const { ListObjectsV2Command } = await loadSdk()
      const out = await config.client.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix ? String(prefix) : undefined,
        ContinuationToken: continuationToken ? String(continuationToken) : undefined,
        MaxKeys: typeof maxKeys === 'number' ? maxKeys : 100,
      })) as R2ListObjectsOutput
      return {
        keys: (out.Contents ?? []).map(c => ({ key: c.Key, size: c.Size, lastModified: c.LastModified })),
        nextContinuationToken: out.NextContinuationToken,
        truncated: out.IsTruncated ?? false,
      }
    },
  })
}

/** Create a tool that deletes an object from the configured R2 bucket.
 *
 * @param config R2 client and bucket.
 * @returns An R2 object deletion tool. */
export function cloudflareR2Delete(config: CloudflareR2Config) {
  return defineTool({
    name: 'r2_delete',
    description: 'Delete an object from R2 by key.',
    schema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    } as const,
    async execute({ key }) {
      const { DeleteObjectCommand } = await loadSdk()
      await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: String(key) }))
      return { key, deleted: true }
    },
  })
}

/** Create a signed GET URL tool when a signer is configured.
 *
 * @param config R2 client, bucket, and optional signer.
 * @returns The signed URL tool, or `null` without a signer. */
export function cloudflareR2SignedUrl(config: CloudflareR2Config) {
  if (!config.signGetUrl) return null
  const sign = config.signGetUrl
  return defineTool({
    name: 'r2_signed_url',
    description: 'Generate a pre-signed GET URL for an R2 object.',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        expiresIn: { type: 'number', description: 'Expiry in seconds; default 3600.' },
      },
      required: ['key'],
    } as const,
    async execute({ key, expiresIn }) {
      const url = await sign({
        Bucket: config.bucket,
        Key: String(key),
        expiresIn: typeof expiresIn === 'number' ? expiresIn : 3600,
      })
      return { key, url }
    },
  })
}

/** Build the R2 object tools and include signed URLs when a signer is configured.
 * @example
 * const tools = cloudflareR2({ client, bucket: 'uploads' })

 *
 * @param config R2 client, bucket, and optional signer.
 * @returns The configured R2 tools. */
export function cloudflareR2(config: CloudflareR2Config) {
  const tools = [
    cloudflareR2Get(config),
    cloudflareR2Put(config),
    cloudflareR2List(config),
    cloudflareR2Delete(config),
  ]
  const signed = cloudflareR2SignedUrl(config)
  if (signed) tools.push(signed)
  return tools
}
