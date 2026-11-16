/**
 * Portable round-trip fixtures: every valid fixture passes the public core
 * validators and survives JSON.stringify/JSON.parse with the same canonical
 * hash; every invalid fixture is rejected. See ./README.md.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ErrorCodes, AgentsKitError } from '@agentskit/core'
import { canonicalJson, sha256Hex } from '@agentskit/core/hash'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import { validateEvalRunResult } from '@agentskit/core/eval-format'
import { verifyResultRecord } from '@agentskit/eval/provenance'

interface Case { name: string; value: unknown }
interface Fixture { schemaVersion: number; kind: string; canonicalSha256: string; valid: Case[]; invalid: Case[] }

const dir = join(__dirname, 'fixtures')
const fixtures: Fixture[] = readdirSync(dir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const streamTypes = ['text', 'tool_call', 'tool_result', 'reasoning', 'usage', 'error', 'done']

/** Validators per fixture kind; each throws (or returns false) on invalid input. */
const validators: Record<string, (c: Case) => void> = {
  messages: c => void validateMemoryRecord(c.value),
  tools: c => void validateMemoryRecord(c.value),
  memory: c => void validateMemoryRecord(c.value),
  'vector-documents': ({ value }) => {
    if (!isObj(value) || typeof value.id !== 'string' || typeof value.content !== 'string'
      || !Array.isArray(value.embedding) || !value.embedding.every(n => typeof n === 'number' && Number.isFinite(n))
      || (value.metadata !== undefined && !isObj(value.metadata))) throw new Error('invalid VectorDocument')
  },
  stream: ({ value }) => {
    if (!Array.isArray(value)) throw new Error('stream must be an array')
    for (const chunk of value) {
      if (!isObj(chunk) || !streamTypes.includes(chunk.type as string)) throw new Error('bad chunk type')
      if (chunk.content !== undefined && typeof chunk.content !== 'string') throw new Error('bad content')
      if ((chunk.type === 'tool_call' || chunk.type === 'tool_result') && !isObj(chunk.toolCall)) throw new Error('missing toolCall')
    }
  },
  errors: ({ value }) => {
    if (!isObj(value) || typeof value.message !== 'string' || typeof value.name !== 'string') throw new Error('bad error')
    if (value.name === 'AbortError') return
    const code = value.code as string
    if (!(Object.values(ErrorCodes) as string[]).includes(code)) throw new Error('unknown code')
    const err = new AgentsKitError({ code, message: value.message, hint: value.hint as string | undefined, docsUrl: value.docsUrl as string | undefined })
    if (err.code !== code) throw new Error('code not preserved')
  },
  eval: c => {
    if (isObj(c.value) && 'digest' in c.value) {
      if (!verifyResultRecord(c.value)) throw new Error('result record failed verification')
    } else validateEvalRunResult(c.value)
  },
}

const canonicalHash = (v: unknown) => sha256Hex(canonicalJson(v))

describe('portable interop fixtures', () => {
  it('covers messages, tools, memory, stream, errors and eval', () => {
    expect(fixtures.map(f => f.kind).sort()).toEqual(
      ['errors', 'eval', 'memory', 'messages', 'stream', 'tools', 'vector-documents'])
  })

  for (const fixture of fixtures) {
    describe(fixture.kind, () => {
      const validate = validators[fixture.kind]!
      it('declares schemaVersion 1', () => expect(fixture.schemaVersion).toBe(1))
      it('has a pinned canonical hash', () => expect(canonicalHash(fixture.valid)).toBe(fixture.canonicalSha256))
      for (const c of fixture.valid) {
        it(`accepts ${c.name} and round-trips with the same canonical hash`, () => {
          expect(() => validate(c)).not.toThrow()
          const back = JSON.parse(JSON.stringify(c.value)) as unknown
          expect(canonicalHash(back)).toBe(canonicalHash(c.value))
          expect(() => validate({ name: c.name, value: back })).not.toThrow()
        })
      }
      for (const c of fixture.invalid) {
        it(`rejects ${c.name}`, () => expect(() => validate(c)).toThrow())
      }
    })
  }

  it('cancellation: an aborted signal yields an AbortError matching the fixture', () => {
    const ctl = new AbortController()
    ctl.abort()
    const reason = ctl.signal.reason as Error
    const abort = fixtures.find(f => f.kind === 'errors')!.valid.find(c => c.name === 'abort')!.value as { name: string }
    expect(reason.name).toBe(abort.name)
  })
})
