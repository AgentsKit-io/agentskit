/**
 * Canonical inventory of every exported built-in SkillDefinition.
 * Used by the ADR 0005 contract harness and discovery tests.
 * Keep in sync with packages/skills/src/index.ts skill exports.
 */
import type { SkillDefinition } from '@agentskit/core'
import {
  codeReviewer,
  coder,
  clinicalNoteSummarizer,
  contractReviewer,
  critic,
  curriculumDesigner,
  customerSupport,
  dataAnalyst,
  financialAdvisor,
  healthcareAssistant,
  legalAssistant,
  listingConcierge,
  marketAnalyst,
  merchandisingAnalyst,
  planner,
  prReviewer,
  researcher,
  securityAuditor,
  sqlAnalyst,
  sqlGen,
  storefrontConcierge,
  summarizer,
  technicalWriter,
  transactionTriage,
  translator,
  tutor,
} from '../src/index'

/** All 26 exported built-in SkillDefinition objects (translatorWithGlossary is a factory, not counted). */
export const ALL_BUILTIN_SKILLS: readonly SkillDefinition[] = [
  researcher,
  coder,
  planner,
  critic,
  summarizer,
  codeReviewer,
  prReviewer,
  sqlGen,
  dataAnalyst,
  translator,
  sqlAnalyst,
  technicalWriter,
  securityAuditor,
  customerSupport,
  healthcareAssistant,
  clinicalNoteSummarizer,
  financialAdvisor,
  transactionTriage,
  legalAssistant,
  contractReviewer,
  tutor,
  curriculumDesigner,
  storefrontConcierge,
  merchandisingAnalyst,
  listingConcierge,
  marketAnalyst,
] as const

export const BUILTIN_SKILL_COUNT = 26

export const BUILTIN_SKILL_NAMES: readonly string[] = ALL_BUILTIN_SKILLS.map(s => s.name)

/** S1 — ADR 0005 / ADR 0002 T1 name shape. */
export const SKILL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/
