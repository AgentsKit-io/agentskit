import { z } from 'zod'

const ValidationSummarySchema = z.object({
  status: z.literal('approved'),
  score: z.number().min(95).max(100),
  confidence: z.number().min(0.95).max(1),
}).strict()

const ValidationEvidenceSchema = ValidationSummarySchema.extend({
  method: z.literal('codex-executor-independent-reviewer'),
  iterations: z.number().int().positive(),
  cases: z.number().int().positive(),
  summary: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)),
  notes: z.array(z.string().trim().min(1)),
}).strict()

export type RegistryValidationSummary = z.infer<typeof ValidationSummarySchema>
export type RegistryValidationEvidence = z.infer<typeof ValidationEvidenceSchema>

export function parseValidationSummary(value: unknown): RegistryValidationSummary | undefined {
  const result = ValidationSummarySchema.safeParse(value)
  return result.success ? result.data : undefined
}

export function parseValidationEvidence(value: unknown): RegistryValidationEvidence | undefined {
  const result = ValidationEvidenceSchema.safeParse(value)
  return result.success ? result.data : undefined
}
