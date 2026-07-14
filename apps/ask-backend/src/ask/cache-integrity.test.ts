import { describe, expect, it } from 'vitest'
import { isCompleteCachedAnswer } from './cache-integrity'

const complete = {
  model: 'test-model',
  createdAt: 1,
  events: [
    { type: 'text', delta: 'Use the code reviewer.' },
    { type: 'tool', id: 'sources', name: 'cite', args: { sources: [] } },
    { type: 'done', model: 'test-model' },
  ],
}

describe('isCompleteCachedAnswer', () => {
  it('accepts one valid terminal event after answer content', () => {
    expect(isCompleteCachedAnswer(complete)).toBe(true)
  })

  it.each([
    null,
    [],
    {},
    { ...complete, createdAt: Number.NaN },
    { ...complete, model: '' },
    { ...complete, events: [{ type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'text', delta: 1 }, { type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'tool', id: 'x', name: 'cite', args: [] }, { type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'unknown' }, { type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'text', delta: 'partial' }, { type: 'done', model: 'other' }] },
    { ...complete, events: [{ type: 'done', model: 'test-model' }, { type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'error', message: 'failed' }, { type: 'done', model: 'test-model' }] },
    { ...complete, events: [{ type: 'text', delta: 'partial' }, { type: 'error', message: 'failed' }] },
  ])('rejects incomplete or malformed value %#', (value) => {
    expect(isCompleteCachedAnswer(value)).toBe(false)
  })
})
