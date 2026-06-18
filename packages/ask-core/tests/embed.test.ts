import { describe, expect, it } from 'vitest'
import { EMBED_DIM, EMBED_MODEL } from '../src/embed'

describe('embed metadata', () => {
  it('exposes the bge-small dimensionality + model id (must match the committed index)', () => {
    expect(EMBED_DIM).toBe(384)
    expect(EMBED_MODEL).toBe('Xenova/bge-small-en-v1.5')
  })
})
