export {
  taskSuccess,
  factualGrounding,
  citationCorrectness,
  toolArgValidity,
} from './quality'
export type {
  FactualGroundingMeta,
  CitationMeta,
  ToolArgValidityInput,
} from './quality'

export {
  schemaSurvival,
  hitlGateCorrectness,
  fallbackResilience,
  noCrashSurvival,
} from './robustness'
export type {
  SchemaValidityMeta,
  HitlMeta,
  FallbackMeta,
  CrashMeta,
} from './robustness'

import { taskSuccess, factualGrounding, citationCorrectness, toolArgValidity } from './quality'
import {
  schemaSurvival,
  hitlGateCorrectness,
  fallbackResilience,
  noCrashSurvival,
} from './robustness'
import type { ScorerFamily } from '../types'

/** The four built-in quality scorers grouped as one scorer family. */
export const qualityFamily: ScorerFamily = {
  family: 'quality',
  scorers: [
    taskSuccess as ScorerFamily['scorers'][number],
    factualGrounding as ScorerFamily['scorers'][number],
    citationCorrectness as ScorerFamily['scorers'][number],
    toolArgValidity as ScorerFamily['scorers'][number],
  ],
}

/** The four built-in robustness scorers grouped as one scorer family. */
export const robustnessFamily: ScorerFamily = {
  family: 'robustness',
  scorers: [
    schemaSurvival as ScorerFamily['scorers'][number],
    hitlGateCorrectness as ScorerFamily['scorers'][number],
    fallbackResilience as ScorerFamily['scorers'][number],
    noCrashSurvival as ScorerFamily['scorers'][number],
  ],
}

/** Flat list of all built-in quality and robustness scorers. */
export const ALL_SCORERS: ScorerFamily['scorers'] = [
  ...qualityFamily.scorers,
  ...robustnessFamily.scorers,
]
