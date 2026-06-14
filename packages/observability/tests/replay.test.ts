import { describe, expect, it } from 'vitest'
import { replayEvents } from '../src/index'

describe('replayEvents', () => {
  it('feeds each event through every handler in order', async () => {
    const seen: string[] = []
    await replayEvents(
      ['a', 'b'],
      [(e) => void seen.push(`h1:${e}`), (e) => void seen.push(`h2:${e}`)],
    )
    expect(seen).toEqual(['h1:a', 'h2:a', 'h1:b', 'h2:b'])
  })

  it('awaits async handlers', async () => {
    const seen: number[] = []
    await replayEvents(
      [1, 2],
      [async (e) => { await Promise.resolve(); seen.push(e) }],
    )
    expect(seen).toEqual([1, 2])
  })
})
