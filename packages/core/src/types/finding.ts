/**
 * The canonical finding shape for agents that surface issues — code review,
 * security audit, compliance/screening, contract review. A shared type so
 * findings from different agents are interoperable: dashboards, eval scorers,
 * and AKOS workflow steps can consume them without parsing free text.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/** Ordered most→least severe; use for sorting / gate thresholds. */
export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export interface Finding {
  /** Stable id within a run (for dedup / referencing). */
  id: string
  severity: Severity
  /** Short imperative headline. */
  title: string
  /** Why it matters, concretely. */
  detail: string
  /** Optional category/dimension, e.g. 'security' | 'correctness' | 'privilege'. */
  category?: string
  /** Where it is — file:line, URL, clause id, field path. */
  location?: string
  /** 0..1 confidence the finding is real and actionable. */
  confidence?: number
  /** What to do instead. */
  remediation?: string
  /** Optional standards reference, e.g. 'CWE-89'. */
  ref?: string
  metadata?: Record<string, unknown>
}
