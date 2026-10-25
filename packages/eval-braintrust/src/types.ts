/** Input fields passed to a scorer, including optional expected output and metadata. */
export interface ScorerInput<TExpected = unknown, TMeta = Record<string, unknown>> {
  input: string
  output: string
  expected?: TExpected
  metadata?: TMeta
}

/** Name, normalized score, and optional explanation and metadata returned by a scorer. */
export interface ScorerResult {
  name: string
  score: number
  rationale?: string
  metadata?: Record<string, unknown>
}

/** Function that scores one input and may return its result asynchronously. */
export type Scorer<TExpected = unknown, TMeta = Record<string, unknown>> = (
  args: ScorerInput<TExpected, TMeta>,
) => ScorerResult | Promise<ScorerResult>

/** A named group of scorers for one evaluation dimension. */
export interface ScorerFamily {
  family: 'quality' | 'robustness'
  scorers: Scorer[]
}
