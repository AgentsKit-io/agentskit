import type { SkillDefinition } from '@agentskit/core'
import { researcher } from './researcher'
import { coder } from './coder'
import { planner } from './planner'
import { critic } from './critic'
import { summarizer } from './summarizer'
import { codeReviewer } from './code-reviewer'
import { prReviewer } from './pr-reviewer'
import { sqlGen } from './sql-gen'
import { dataAnalyst } from './data-analyst'
import { translator } from './translator'
import { sqlAnalyst } from './sql-analyst'
import { technicalWriter } from './technical-writer'
import { securityAuditor } from './security-auditor'
import { customerSupport } from './customer-support'
import { healthcareAssistant, clinicalNoteSummarizer } from './healthcare'
import { financialAdvisor, transactionTriage } from './finance'
import { legalAssistant, contractReviewer } from './legal'
import { tutor, curriculumDesigner } from './education'
import { storefrontConcierge, merchandisingAnalyst } from './ecommerce'
import { listingConcierge, marketAnalyst } from './real-estate'
import { cloneSkillDefinition } from './utils'

/** Canonical catalog: 26 built-ins, fixed order (package + CLI discovery). */
const BUILTIN_CATALOG: readonly SkillDefinition[] = [
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
]

export interface SkillMetadata {
  name: string
  description: string
  tools: string[]
  delegates: string[]
}

/** Defensive clones of every built-in skill in catalog order. */
export function getBuiltinSkills(): SkillDefinition[] {
  return BUILTIN_CATALOG.map(cloneSkillDefinition)
}

/** Metadata for all built-ins, sorted lexicographically by name. Defensive arrays. */
export function listSkills(): SkillMetadata[] {
  return BUILTIN_CATALOG.map(s => ({
    name: s.name,
    description: s.description,
    tools: (s.tools ?? []).slice(),
    delegates: (s.delegates ?? []).slice(),
  })).sort((a, b) => a.name.localeCompare(b.name))
}
