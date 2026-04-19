import { describe, expect, it } from 'vitest'
import {
  detectCodeArtifacts,
  parseUIMessage,
  validateArtifact,
  validateElement,
  validateUIMessage,
} from '../src/generative-ui'

describe('validateElement', () => {
  it('accepts text / heading / list / button / image', () => {
    expect(validateElement({ kind: 'text', text: 'hi' }).kind).toBe('text')
    expect(validateElement({ kind: 'heading', level: 2, text: 'h' }).kind).toBe('heading')
    expect(validateElement({ kind: 'list', items: ['a', 'b'] }).kind).toBe('list')
    expect(validateElement({ kind: 'button', label: 'go', action: 'submit' }).kind).toBe('button')
    expect(validateElement({ kind: 'image', src: '/x.png' }).kind).toBe('image')
  })

  it('recursively validates card / stack children', () => {
    const root = validateElement({
      kind: 'stack',
      direction: 'row',
      children: [{ kind: 'text', text: 'hi' }, { kind: 'text', text: 'there' }],
    })
    expect(root.kind).toBe('stack')
  })

  it('rejects unknown kinds', () => {
    expect(() => validateElement({ kind: 'scribble' })).toThrow(/unknown element.kind/)
  })

  it('rejects malformed children', () => {
    expect(() => validateElement({ kind: 'card', children: 'nope' })).toThrow(/children must be/)
  })
})

describe('validateArtifact', () => {
  it('accepts code, markdown, html, chart', () => {
    expect(validateArtifact({ type: 'code', language: 'ts', source: 'x' }).type).toBe('code')
    expect(validateArtifact({ type: 'markdown', source: '# hi' }).type).toBe('markdown')
    expect(validateArtifact({ type: 'html', source: '<p/>' }).type).toBe('html')
    expect(validateArtifact({ type: 'chart', chartType: 'bar', data: [] }).type).toBe('chart')
  })

  it('rejects unknown artifact types', () => {
    expect(() => validateArtifact({ type: 'video' })).toThrow(/unknown artifact.type/)
  })
})

describe('validateUIMessage', () => {
  it('validates version + root', () => {
    const msg = validateUIMessage({ version: 1, root: { kind: 'text', text: 'hi' } })
    expect(msg.version).toBe(1)
    expect(msg.root.kind).toBe('text')
  })

  it('rejects other versions', () => {
    expect(() => validateUIMessage({ version: 2, root: {} })).toThrow(/unsupported version/)
  })
})

describe('parseUIMessage', () => {
  it('extracts fenced JSON', () => {
    const msg = parseUIMessage('here is the ui:\n```json\n{"version":1,"root":{"kind":"text","text":"hi"}}\n```')
    expect(msg.root.kind).toBe('text')
  })

  it('accepts raw JSON', () => {
    const msg = parseUIMessage('{"version":1,"root":{"kind":"text","text":"hello"}}')
    expect((msg.root as { text: string }).text).toBe('hello')
  })

  it('throws when no JSON present', () => {
    expect(() => parseUIMessage('plain prose')).toThrow(/no JSON object/)
  })
})

describe('detectCodeArtifacts', () => {
  it('extracts one or more fenced code blocks', () => {
    const text = 'intro\n```ts\nconst x = 1\n```\nmore\n```python\nprint(1)\n```'
    const out = detectCodeArtifacts(text)
    expect(out).toHaveLength(2)
    expect(out[0]!.artifact).toMatchObject({ language: 'ts' })
    expect(out[1]!.artifact).toMatchObject({ language: 'python' })
  })

  it('defaults language to plaintext when none specified', () => {
    const out = detectCodeArtifacts('```\nhello\n```')
    expect(out[0]!.artifact.language).toBe('plaintext')
  })
})
