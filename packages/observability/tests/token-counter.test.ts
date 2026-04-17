import { describe, it, expect, vi } from 'vitest'
import type { TokenCounter } from '@agentskit/core'
import {
  approximateCounter,
  countTokens,
  countTokensDetailed,
  createProviderCounter,
} from '../src/token-counter'

const msgs = [
  { role: 'user' as const, content: 'Hello world' },
  { role: 'assistant' as const, content: 'Hi there, how can I help?' },
]

// ---------------------------------------------------------------------------
// approximateCounter
// ---------------------------------------------------------------------------

describe('approximateCounter', () => {
  it('has name "approximate"', () => {
    expect(approximateCounter.name).toBe('approximate')
  })

  it('estimates tokens using chars/4 + 4 overhead per message', () => {
    const result = approximateCounter.count([{ role: 'user', content: 'abcd' }])
    // ceil(4/4) + 4 = 5
    expect(result).toBe(5)
  })

  it('counts multiple messages', () => {
    const total = approximateCounter.count(msgs)
    // 'Hello world' = 11 chars => ceil(11/4)=3, +4 = 7
    // 'Hi there, how can I help?' = 25 chars => ceil(25/4)=7, +4 = 11
    // total = 18
    expect(total).toBe(18)
  })

  it('handles empty messages list', () => {
    expect(approximateCounter.count([])).toBe(0)
  })

  it('handles empty content', () => {
    const result = approximateCounter.count([{ role: 'user', content: '' }])
    // ceil(0/4)=0, +4 = 4
    expect(result).toBe(4)
  })

  it('countDetailed returns per-message breakdown', () => {
    const result = approximateCounter.countDetailed!(msgs)
    expect(result).toEqual({
      total: 18,
      perMessage: [7, 11],
    })
  })

  it('countDetailed total matches count', () => {
    const total = approximateCounter.count(msgs)
    const detailed = approximateCounter.countDetailed!(msgs)
    expect(detailed.total).toBe(total)
  })
})

// ---------------------------------------------------------------------------
// countTokens (convenience)
// ---------------------------------------------------------------------------

describe('countTokens', () => {
  it('uses approximateCounter by default', async () => {
    const total = await countTokens(msgs)
    expect(total).toBe(approximateCounter.count(msgs))
  })

  it('accepts a custom counter', async () => {
    const custom: TokenCounter = {
      name: 'fixed',
      count: () => 42,
    }
    const total = await countTokens(msgs, { counter: custom })
    expect(total).toBe(42)
  })

  it('passes model option through', async () => {
    const spy = vi.fn().mockReturnValue(10)
    const custom: TokenCounter = {
      name: 'spy',
      count: spy,
    }
    await countTokens(msgs, { counter: custom, model: 'gpt-4o' })
    expect(spy).toHaveBeenCalledWith(msgs, expect.objectContaining({ model: 'gpt-4o' }))
  })
})

// ---------------------------------------------------------------------------
// countTokensDetailed
// ---------------------------------------------------------------------------

describe('countTokensDetailed', () => {
  it('uses approximateCounter by default', async () => {
    const result = await countTokensDetailed(msgs)
    expect(result).toEqual(approximateCounter.countDetailed!(msgs))
  })

  it('falls back to per-message count when countDetailed is missing', async () => {
    const custom: TokenCounter = {
      name: 'no-detailed',
      count: (m) => m.length * 10,
    }
    const result = await countTokensDetailed(msgs, { counter: custom })
    // Each individual message: count([msg]) => 1 * 10 = 10
    expect(result).toEqual({
      total: 20,
      perMessage: [10, 10],
    })
  })

  it('uses countDetailed when available', async () => {
    const custom: TokenCounter = {
      name: 'with-detailed',
      count: () => 99,
      countDetailed: () => ({ total: 50, perMessage: [20, 30] }),
    }
    const result = await countTokensDetailed(msgs, { counter: custom })
    expect(result).toEqual({ total: 50, perMessage: [20, 30] })
  })
})

// ---------------------------------------------------------------------------
// createProviderCounter
// ---------------------------------------------------------------------------

describe('createProviderCounter', () => {
  it('creates a counter with the given name', () => {
    const counter = createProviderCounter({
      name: 'test-tokenizer',
      tokenize: (text) => text.split(' '),
    })
    expect(counter.name).toBe('test-tokenizer')
  })

  it('counts tokens using the provided tokenize function', async () => {
    const counter = createProviderCounter({
      name: 'word-splitter',
      tokenize: (text) => text.split(' '),
    })
    // 'Hello world' => 2 words + 4 overhead = 6
    const total = await counter.count([{ role: 'user', content: 'Hello world' }])
    expect(total).toBe(6)
  })

  it('supports custom per-message overhead', async () => {
    const counter = createProviderCounter({
      name: 'custom-overhead',
      tokenize: (text) => text.split(' '),
      perMessageOverhead: 0,
    })
    // 'Hello world' => 2 words + 0 overhead = 2
    const total = await counter.count([{ role: 'user', content: 'Hello world' }])
    expect(total).toBe(2)
  })

  it('passes model to tokenize', async () => {
    const spy = vi.fn().mockReturnValue(['a', 'b'])
    const counter = createProviderCounter({
      name: 'spy-counter',
      tokenize: spy,
    })
    await counter.count([{ role: 'user', content: 'hi' }], { model: 'gpt-4o' })
    expect(spy).toHaveBeenCalledWith('hi', 'gpt-4o')
  })

  it('countDetailed returns per-message breakdown', async () => {
    const counter = createProviderCounter({
      name: 'word-splitter',
      tokenize: (text) => text.split(' '),
    })
    const result = await counter.countDetailed!(msgs)
    // 'Hello world' => 2 words+4=6, 'Hi there, how can I help?' => 6 words+4=10
    expect(result).toEqual({
      total: 16,
      perMessage: [6, 10],
    })
  })

  it('supports async tokenize', async () => {
    const counter = createProviderCounter({
      name: 'async-tokenizer',
      tokenize: async (text) => {
        return text.split('')
      },
    })
    // 'ab' => 2 chars + 4 overhead = 6
    const total = await counter.count([{ role: 'user', content: 'ab' }])
    expect(total).toBe(6)
  })
})
