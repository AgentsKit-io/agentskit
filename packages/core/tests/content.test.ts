import { describe, expect, it } from 'vitest'
import {
  audioPart,
  filePart,
  filterParts,
  imagePart,
  normalizeContent,
  partsToText,
  textPart,
  videoPart,
} from '../src/types/content'

describe('part builders', () => {
  it('textPart', () => {
    expect(textPart('hi')).toEqual({ type: 'text', text: 'hi' })
  })

  it('imagePart with options', () => {
    expect(imagePart('https://x/a.png', { mimeType: 'image/png', detail: 'high' })).toEqual({
      type: 'image',
      source: 'https://x/a.png',
      mimeType: 'image/png',
      detail: 'high',
    })
  })

  it('audioPart / videoPart / filePart', () => {
    expect(audioPart('a.mp3').type).toBe('audio')
    expect(videoPart('v.mp4', { durationSec: 10 }).durationSec).toBe(10)
    expect(filePart('doc.pdf', { filename: 'doc.pdf' }).filename).toBe('doc.pdf')
  })
})

describe('partsToText', () => {
  it('flattens text parts', () => {
    expect(partsToText([textPart('hello'), textPart('world')])).toBe('hello\nworld')
  })

  it('renders placeholders for non-text parts', () => {
    const out = partsToText([
      textPart('caption'),
      imagePart('pic.png'),
      audioPart('clip.mp3'),
      videoPart('v.mp4'),
      filePart('doc.pdf', { filename: 'doc.pdf' }),
    ])
    expect(out).toContain('caption')
    expect(out).toContain('[image: pic.png]')
    expect(out).toContain('[audio: clip.mp3]')
    expect(out).toContain('[video: v.mp4]')
    expect(out).toContain('[file: doc.pdf]')
  })

  it('falls back to source when filename missing', () => {
    expect(partsToText([filePart('s3://bucket/x')])).toBe('[file: s3://bucket/x]')
  })
})

describe('normalizeContent', () => {
  it('prefers parts when non-empty', () => {
    const r = normalizeContent('ignored', [textPart('hi')])
    expect(r.parts).toHaveLength(1)
    expect(r.text).toBe('hi')
  })

  it('wraps plain string in a text part', () => {
    const r = normalizeContent('plain', undefined)
    expect(r.parts).toEqual([{ type: 'text', text: 'plain' }])
    expect(r.text).toBe('plain')
  })

  it('empty string yields empty parts', () => {
    const r = normalizeContent('', undefined)
    expect(r.parts).toEqual([])
    expect(r.text).toBe('')
  })

  it('empty parts array falls back to string', () => {
    const r = normalizeContent('x', [])
    expect(r.parts).toEqual([{ type: 'text', text: 'x' }])
  })
})

describe('filterParts', () => {
  it('returns only parts of the requested kind', () => {
    const parts = [textPart('a'), imagePart('x'), textPart('b'), audioPart('y')]
    const texts = filterParts(parts, 'text')
    expect(texts.map(p => p.text)).toEqual(['a', 'b'])
    const images = filterParts(parts, 'image')
    expect(images).toHaveLength(1)
  })
})
