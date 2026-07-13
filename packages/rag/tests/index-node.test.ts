import { describe, expect, it } from 'vitest'
import * as nodeEntry from '../src/index-node'
import { loadS3 as loadS3Node } from '../src/loaders-node'
import { loadS3 as loadS3Universal } from '../src/loaders'

describe('Node package entry', () => {
  it('overrides only the S3 loader with the lazy Node resolver', () => {
    expect(nodeEntry.createRAG).toBeTypeOf('function')
    expect(nodeEntry.loadS3).toBe(loadS3Node)
    expect(nodeEntry.loadS3).not.toBe(loadS3Universal)
  })
})
