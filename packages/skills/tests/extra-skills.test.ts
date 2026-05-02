import { describe, expect, it } from 'vitest'
import {
  codeReviewer,
  customerSupport,
  securityAuditor,
  sqlAnalyst,
  sqlGen,
  technicalWriter,
} from '../src/index'
import type { SkillDefinition } from '@agentskit/core'

const all: Array<{ skill: SkillDefinition; name: string }> = [
  { skill: codeReviewer, name: 'code-reviewer' },
  { skill: customerSupport, name: 'customer-support' },
  { skill: securityAuditor, name: 'security-auditor' },
  { skill: sqlAnalyst, name: 'sql-analyst' },
  { skill: sqlGen, name: 'sql-gen' },
  { skill: technicalWriter, name: 'technical-writer' },
]

describe('skill contract — extras', () => {
  for (const { skill, name } of all) {
    describe(name, () => {
      it('has the expected name', () => {
        expect(skill.name).toBe(name)
      })

      it('has a description', () => {
        expect(skill.description).toBeTruthy()
        expect(skill.description!.length).toBeGreaterThan(20)
      })

      it('has a substantive systemPrompt', () => {
        expect(skill.systemPrompt).toBeTruthy()
        expect(skill.systemPrompt.length).toBeGreaterThan(150)
      })

      it('has tools + delegates arrays', () => {
        expect(Array.isArray(skill.tools)).toBe(true)
        expect(Array.isArray(skill.delegates)).toBe(true)
      })

      it('has at least one example with input + output', () => {
        expect(skill.examples).toBeDefined()
        expect(skill.examples!.length).toBeGreaterThan(0)
        for (const ex of skill.examples!) {
          expect(ex.input).toBeTruthy()
          expect(ex.output).toBeTruthy()
        }
      })
    })
  }
})

describe('codeReviewer behaviour signals', () => {
  it('mentions verdict format', () => {
    expect(codeReviewer.systemPrompt).toMatch(/APPROVE|REQUEST CHANGES|COMMENT/)
  })

  it('demands file:line citation', () => {
    expect(codeReviewer.systemPrompt).toMatch(/file:line/)
  })

  it('lists severity tags', () => {
    expect(codeReviewer.systemPrompt).toMatch(/blocker|high|med|nit/)
  })
})

describe('customerSupport behaviour signals', () => {
  it('emphasises empathy or tone', () => {
    expect(customerSupport.systemPrompt).toMatch(/empath|tone|respect|kind|polite/i)
  })

  it('acknowledges the customer issue first', () => {
    expect(customerSupport.systemPrompt.length).toBeGreaterThan(200)
  })
})

describe('securityAuditor behaviour signals', () => {
  it('references known vulnerability classes', () => {
    expect(securityAuditor.systemPrompt).toMatch(/SQL|XSS|CSRF|injection|auth|secret/i)
  })

  it('outputs structured findings', () => {
    expect(securityAuditor.systemPrompt).toMatch(/severity|impact|exploit|CVE|finding/i)
  })
})

describe('sqlAnalyst behaviour signals', () => {
  it('mentions read-only / safe SQL posture', () => {
    expect(sqlAnalyst.systemPrompt).toMatch(/SELECT|read-only|read only|never write|no writes/i)
  })

  it('guides interpretation', () => {
    expect(sqlAnalyst.systemPrompt.length).toBeGreaterThan(200)
  })
})

describe('sqlGen behaviour signals', () => {
  it('emphasises parameterised queries', () => {
    expect(sqlGen.systemPrompt).toMatch(/parameter|placeholder|\$1|\?/i)
  })

  it('warns about injection / unsafe concatenation', () => {
    expect(sqlGen.systemPrompt).toMatch(/inject|escape|sanitize|safe|concatenat/i)
  })
})

describe('technicalWriter behaviour signals', () => {
  it('mentions clarity / structure', () => {
    expect(technicalWriter.systemPrompt).toMatch(/clear|concise|structure|reader|audience|plain/i)
  })

  it('avoids fluff guidance', () => {
    expect(technicalWriter.systemPrompt.length).toBeGreaterThan(150)
  })
})
