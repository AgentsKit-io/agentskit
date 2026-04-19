import { defineTool } from '@agentskit/core'

/**
 * S3-compatible object storage tool. The AWS SDK is heavy — instead
 * of bundling it, accept a minimal `S3Client` interface the caller
 * hands in. Works with @aws-sdk/client-s3, @aws-sdk/lib-storage,
 * MinIO SDK, Cloudflare R2's S3 wrapper, etc.
 */

export interface S3Client {
  getObject: (input: { bucket: string; key: string }) => Promise<{ body: string }>
  putObject: (input: { bucket: string; key: string; body: string; contentType?: string }) => Promise<{ etag?: string }>
  listObjects: (input: { bucket: string; prefix?: string; limit?: number }) => Promise<Array<{ key: string; size?: number }>>
}

export interface S3Config {
  client: S3Client
  /** Default bucket if the agent omits one. */
  defaultBucket?: string
}

export function s3GetObject(config: S3Config) {
  return defineTool({
    name: 's3_get_object',
    description: 'Read an object from S3-compatible storage as text.',
    schema: {
      type: 'object',
      properties: { bucket: { type: 'string' }, key: { type: 'string' } },
      required: ['key'],
    } as const,
    async execute({ bucket, key }) {
      const target = (bucket as string) ?? config.defaultBucket
      if (!target) throw new Error('s3_get_object: bucket required')
      const result = await config.client.getObject({ bucket: target, key: String(key) })
      return { bucket: target, key, body: result.body }
    },
  })
}

export function s3PutObject(config: S3Config) {
  return defineTool({
    name: 's3_put_object',
    description: 'Upload a text object to S3-compatible storage.',
    schema: {
      type: 'object',
      properties: {
        bucket: { type: 'string' },
        key: { type: 'string' },
        body: { type: 'string' },
        content_type: { type: 'string' },
      },
      required: ['key', 'body'],
    } as const,
    async execute({ bucket, key, body, content_type }) {
      const target = (bucket as string) ?? config.defaultBucket
      if (!target) throw new Error('s3_put_object: bucket required')
      const result = await config.client.putObject({
        bucket: target,
        key: String(key),
        body: String(body),
        contentType: content_type as string | undefined,
      })
      return { bucket: target, key, etag: result.etag }
    },
  })
}

export function s3ListObjects(config: S3Config) {
  return defineTool({
    name: 's3_list_objects',
    description: 'List objects in an S3-compatible bucket by prefix.',
    schema: {
      type: 'object',
      properties: {
        bucket: { type: 'string' },
        prefix: { type: 'string' },
        limit: { type: 'number' },
      },
    } as const,
    async execute({ bucket, prefix, limit }) {
      const target = (bucket as string) ?? config.defaultBucket
      if (!target) throw new Error('s3_list_objects: bucket required')
      const items = await config.client.listObjects({
        bucket: target,
        prefix: prefix as string | undefined,
        limit: (limit as number | undefined) ?? 100,
      })
      return items
    },
  })
}

export function s3(config: S3Config) {
  return [s3GetObject(config), s3PutObject(config), s3ListObjects(config)]
}
