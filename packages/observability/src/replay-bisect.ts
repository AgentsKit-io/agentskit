// replay-bisect: find the regression-causing change.
// Pure: caller supplies a change history (oldest-first) and an async oracle
// that replays the run at a given change-index and returns ok/fail. The
// bisector walks the history with O(log n) probes.

export type BisectVerdict =
  | { readonly kind: 'culprit'; readonly index: number; readonly probes: number }
  | { readonly kind: 'all_clean'; readonly probes: number }
  | { readonly kind: 'all_broken'; readonly probes: number }
  | { readonly kind: 'inconsistent'; readonly probes: number; readonly detail: string }

export type ReplayOracle = (changeIndex: number) => Promise<'pass' | 'fail'>

export type BisectOpts = {
  readonly maxProbes?: number
  readonly onProbe?: (changeIndex: number, result: 'pass' | 'fail') => void
}

const DEFAULT_MAX_PROBES = 64

/**
 * Locate the earliest change that flips the run from pass to fail.
 * Convention: index 0 is the oldest known-good change; higher indices are
 * newer. The oracle returns 'fail' for any index ≥ the culprit and 'pass'
 * before. Returns the first failing index, or `all_clean` / `all_broken`
 * when no transition exists.
 */
export const replayBisect = async (
  history: readonly { readonly id: string }[],
  oracle: ReplayOracle,
  opts: BisectOpts = {},
): Promise<BisectVerdict> => {
  const maxProbes = opts.maxProbes ?? DEFAULT_MAX_PROBES
  const n = history.length
  if (n === 0) return { kind: 'all_clean', probes: 0 }

  let probes = 0
  const probe = async (i: number): Promise<'pass' | 'fail'> => {
    probes += 1
    const result = await oracle(i)
    opts.onProbe?.(i, result)
    return result
  }

  if (probes >= maxProbes) return { kind: 'inconsistent', probes, detail: 'maxProbes=0' }
  const head = await probe(n - 1)
  if (head === 'pass') return { kind: 'all_clean', probes }

  if (probes >= maxProbes) return { kind: 'inconsistent', probes, detail: 'reached maxProbes before tail probe' }
  const tail = await probe(0)
  if (tail === 'fail') return { kind: 'all_broken', probes }

  let lo = 0
  let hi = n - 1
  while (lo + 1 < hi) {
    if (probes >= maxProbes) {
      return { kind: 'inconsistent', probes, detail: `maxProbes=${maxProbes} hit before convergence` }
    }
    const mid = Math.floor((lo + hi) / 2)
    const result = await probe(mid)
    if (result === 'fail') hi = mid
    else lo = mid
  }
  return { kind: 'culprit', index: hi, probes }
}
