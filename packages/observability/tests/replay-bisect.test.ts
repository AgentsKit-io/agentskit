import { describe, expect, it } from 'vitest'
import { replayBisect } from '../src/replay-bisect'

describe('replayBisect', () => {
  const history = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` }))

  it('finds the earliest failing change (culprit)', async () => {
    // culprit at index 5: pass for <5, fail for >=5
    const verdict = await replayBisect(history, async (i) => (i >= 5 ? 'fail' : 'pass'))
    expect(verdict).toEqual({ kind: 'culprit', index: 5, probes: expect.any(Number) })
  })

  it('reports all_clean when the newest change still passes', async () => {
    const verdict = await replayBisect(history, async () => 'pass')
    expect(verdict.kind).toBe('all_clean')
  })

  it('reports all_broken when the oldest change already fails', async () => {
    const verdict = await replayBisect(history, async () => 'fail')
    expect(verdict.kind).toBe('all_broken')
  })

  it('treats an empty history as all_clean', async () => {
    const verdict = await replayBisect([], async () => 'fail')
    expect(verdict).toEqual({ kind: 'all_clean', probes: 0 })
  })

  it('honours maxProbes by reporting inconsistent before convergence', async () => {
    const verdict = await replayBisect(history, async (i) => (i >= 5 ? 'fail' : 'pass'), {
      maxProbes: 2,
    })
    expect(verdict.kind).toBe('inconsistent')
  })
})
