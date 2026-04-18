import { describe, expect, it } from 'vitest'
import { attributePromptChange, formatDiff, promptDiff } from '../src/diff'

describe('promptDiff', () => {
  it('returns equal diff for identical prompts', () => {
    const d = promptDiff('a\nb\nc', 'a\nb\nc')
    expect(d.changed).toBe(false)
    expect(d.added).toBe(0)
    expect(d.removed).toBe(0)
    expect(d.lines.every(l => l.op === 'equal')).toBe(true)
  })

  it('detects adds and removes', () => {
    const d = promptDiff('a\nb\nc', 'a\nX\nc')
    expect(d.added).toBe(1)
    expect(d.removed).toBe(1)
    expect(d.changed).toBe(true)
  })

  it('handles pure additions', () => {
    const d = promptDiff('a', 'a\nb')
    expect(d.added).toBe(1)
    expect(d.removed).toBe(0)
  })

  it('handles pure removals', () => {
    const d = promptDiff('a\nb', 'a')
    expect(d.added).toBe(0)
    expect(d.removed).toBe(1)
  })

  it('formatDiff renders unified-diff style', () => {
    const d = promptDiff('a', 'b')
    const text = formatDiff(d)
    expect(text).toContain('- a')
    expect(text).toContain('+ b')
  })
})

describe('attributePromptChange', () => {
  it('reports score 0 when prompt unchanged', () => {
    const r = attributePromptChange({
      oldPrompt: 'system: be nice',
      newPrompt: 'system: be nice',
      oldOutput: 'ok',
      newOutput: 'different',
    })
    expect(r.promptChanged).toBe(false)
    expect(r.score).toBe(0)
  })

  it('picks changed lines whose tokens overlap the output delta', () => {
    const r = attributePromptChange({
      oldPrompt: 'answer briefly',
      newPrompt: 'answer with pirate slang',
      oldOutput: 'Hello there',
      newOutput: 'Ahoy matey pirate greetings',
    })
    expect(r.promptChanged).toBe(true)
    expect(r.outputChanged).toBe(true)
    expect(r.suspectLines.some(l => l.content.includes('pirate'))).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
})
