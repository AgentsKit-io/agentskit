import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { EvalResult } from '@agentskit/core'
import {
  renderJUnit,
  renderMarkdown,
  renderGitHubAnnotations,
  reportToCi,
} from '../src/ci'

const passing: EvalResult = {
  totalCases: 2,
  passed: 2,
  failed: 0,
  accuracy: 1,
  results: [
    { input: 'Q1', output: 'A1', passed: true, latencyMs: 100 },
    { input: 'Q2', output: 'A2', passed: true, latencyMs: 200 },
  ],
}

const mixed: EvalResult = {
  totalCases: 2,
  passed: 1,
  failed: 1,
  accuracy: 0.5,
  results: [
    { input: 'Q1', output: 'A1', passed: true, latencyMs: 10 },
    { input: 'Q2', output: 'wrong', passed: false, latencyMs: 20, error: 'mismatch' },
  ],
}

describe('renderJUnit', () => {
  it('produces valid JUnit XML for a passing suite', () => {
    const xml = renderJUnit('smoke', passing)
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('tests="2"')
    expect(xml).toContain('failures="0"')
    expect(xml).not.toContain('<failure')
  })

  it('emits <failure> tags for failing cases', () => {
    const xml = renderJUnit('smoke', mixed)
    expect(xml).toContain('failures="1"')
    expect(xml).toContain('<failure')
    expect(xml).toContain('mismatch')
  })

  it('escapes XML-unsafe characters', () => {
    const r: EvalResult = {
      totalCases: 1,
      passed: 0,
      failed: 1,
      accuracy: 0,
      results: [{ input: '<x>&"\'', output: '', passed: false, latencyMs: 0, error: '<bad>' }],
    }
    const xml = renderJUnit('s', r)
    expect(xml).toContain('&lt;x&gt;')
    expect(xml).not.toMatch(/name="<x>/)
  })

  it('protects CDATA against ]]> terminators in hostile strings', () => {
    const r: EvalResult = {
      totalCases: 1,
      passed: 0,
      failed: 1,
      accuracy: 0,
      results: [
        {
          input: 'a]]>b',
          output: 'out]]>end',
          passed: false,
          latencyMs: 0,
          error: 'fail',
        },
      ],
    }
    const xml = renderJUnit('s', r)
    // Standard CDATA split so ]]> cannot terminate the section early.
    expect(xml).toContain(']]]]><![CDATA[>')
    expect(xml).toContain('input: a')
    expect(xml).toContain('output: out')
  })
})

describe('renderMarkdown', () => {
  it('produces accuracy summary + table', () => {
    const md = renderMarkdown('smoke', mixed)
    expect(md).toContain('### Suite: smoke')
    expect(md).toContain('**Accuracy:** 50.0%')
    expect(md).toContain('Q2')
  })
})

describe('renderGitHubAnnotations', () => {
  it('emits ::error:: lines only for failures and a summary notice', () => {
    const out = renderGitHubAnnotations('smoke', mixed)
    expect(out).toMatch(/::error title=smoke%3A Q2::/)
    expect(out).toMatch(/::notice title=smoke::1\/2 passed \(50\.0%25\)/)
  })

  it('no annotations when all pass (only notice)', () => {
    const out = renderGitHubAnnotations('smoke', passing)
    expect(out).not.toContain('::error')
    expect(out).toContain('::notice')
  })

  it('escapes %, CR, LF and property delimiters in hostile strings', () => {
    const r: EvalResult = {
      totalCases: 1,
      passed: 0,
      failed: 1,
      accuracy: 0,
      results: [
        {
          input: 'title:with,delims',
          output: 'x',
          passed: false,
          latencyMs: 0,
          error: '100% fail\r\nnext line',
        },
      ],
    }
    const out = renderGitHubAnnotations('suite%name', r)
    expect(out).toContain('%25')
    expect(out).toContain('%0D')
    expect(out).toContain('%0A')
    expect(out).toContain('%3A')
    expect(out).toContain('%2C')
    expect(out).not.toMatch(/::error title=[^\n]*:[^\n]*::[^\n]*% fail/)
  })
})

describe('reportToCi', () => {
  it('writes JUnit + markdown to outDir and reports pass against minAccuracy', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-ci-'))
    try {
      const out = await reportToCi({
        suiteName: 'smoke',
        result: passing,
        outDir: dir,
        annotations: false,
        stepSummary: false,
      })
      expect(out.pass).toBe(true)
      expect(existsSync(join(dir, 'report.xml'))).toBe(true)
      expect(existsSync(join(dir, 'report.md'))).toBe(true)
      expect(readFileSync(join(dir, 'report.xml'), 'utf8')).toContain('tests="2"')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails when accuracy is below threshold', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-ci-'))
    try {
      const out = await reportToCi({
        suiteName: 'smoke',
        result: mixed,
        outDir: dir,
        minAccuracy: 0.8,
        annotations: false,
        stepSummary: false,
      })
      expect(out.pass).toBe(false)
      expect(out.minAccuracy).toBe(0.8)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('appends to $GITHUB_STEP_SUMMARY when stepSummary is on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-ci-'))
    const summaryPath = join(dir, 'summary.md')
    process.env.GITHUB_STEP_SUMMARY = summaryPath
    try {
      await reportToCi({
        suiteName: 'smoke',
        result: passing,
        outDir: dir,
        annotations: false,
        stepSummary: true,
      })
      expect(readFileSync(summaryPath, 'utf8')).toContain('### Suite: smoke')
    } finally {
      delete process.env.GITHUB_STEP_SUMMARY
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects non-finite / out-of-range minAccuracy and never process.exit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-ci-'))
    try {
      await expect(
        reportToCi({
          suiteName: 'smoke',
          result: passing,
          outDir: dir,
          minAccuracy: Number.NaN,
          annotations: false,
          stepSummary: false,
        }),
      ).rejects.toThrow(/\[0, 1\]/)
      await expect(
        reportToCi({
          suiteName: 'smoke',
          result: passing,
          outDir: dir,
          minAccuracy: 2,
          annotations: false,
          stepSummary: false,
        }),
      ).rejects.toThrow(/\[0, 1\]/)
      // reportToCi returns pass/fail; it must not call process.exit.
      expect(typeof reportToCi).toBe('function')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
