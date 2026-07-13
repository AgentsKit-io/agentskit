import { describe, expect, it } from 'vitest'
import { parseValidationEvidence } from './validation'

const approved = {
  status: 'approved',
  method: 'codex-executor-independent-reviewer',
  score: 96,
  confidence: 0.96,
  iterations: 2,
  cases: 3,
  summary: 'The independent reviewer approved all cases.',
  strengths: ['Typed output'],
  notes: [],
}

describe('parseValidationEvidence', () => {
  it('accepts complete evidence above the public threshold', () => {
    expect(parseValidationEvidence(approved)).toEqual(approved)
  })

  it('rejects evidence below either 95% threshold', () => {
    expect(parseValidationEvidence({ ...approved, score: 94 })).toBeUndefined()
    expect(parseValidationEvidence({ ...approved, confidence: 0.94 })).toBeUndefined()
  })

  it('rejects incomplete or unsupported evidence', () => {
    expect(parseValidationEvidence({ ...approved, strengths: undefined })).toBeUndefined()
    expect(parseValidationEvidence({ ...approved, method: 'self-reviewed' })).toBeUndefined()
  })

  it('treats absent evidence as unreviewed', () => {
    expect(parseValidationEvidence(undefined)).toBeUndefined()
  })
})
