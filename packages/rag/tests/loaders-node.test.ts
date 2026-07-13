import { describe, expect, it, vi } from 'vitest'
import { loadS3 } from '../src/loaders-node'

describe('Node S3 loader', () => {
  it('uses explicitly injected commands without resolving the optional peer', async () => {
    class ListCommand { constructor(readonly input: Record<string, unknown>) {} }
    class GetCommand { constructor(readonly input: Record<string, unknown>) {} }
    const send = vi.fn(async (command: { input: Record<string, unknown> }) => (
      'Key' in command.input
        ? { Body: { transformToString: async () => 'body' } }
        : { Contents: [{ Key: 'doc.txt' }], IsTruncated: false }
    ))

    const docs = await loadS3({
      bucket: 'fixture',
      client: { send },
      commands: { ListObjectsV2Command: ListCommand, GetObjectCommand: GetCommand },
    })

    expect(docs).toEqual([{
      content: 'body',
      source: 's3://fixture/doc.txt',
      metadata: { bucket: 'fixture', key: 'doc.txt' },
    }])
  })
})
