import { describe, it, expect } from 'vitest'
import { chunkText } from '../src/chunker'

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('Hello world', { chunkSize: 100, chunkOverlap: 0 })
    expect(chunks).toEqual(['Hello world'])
  })

  it('splits long text into chunks of approximately chunkSize', () => {
    const text = 'word '.repeat(100).trim()
    const chunks = chunkText(text, { chunkSize: 100, chunkOverlap: 0 })
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(105)
    })
  })

  it('splits on whitespace boundary, not mid-word', () => {
    const text = 'abcdef ghijkl mnopqr stuvwx'
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 0 })
    chunks.forEach(chunk => {
      expect(chunk).not.toMatch(/^\s/)
      expect(chunk).not.toMatch(/\s$/)
    })
  })

  it('applies overlap between chunks', () => {
    const text = 'aaa bbb ccc ddd eee fff ggg hhh iii jjj'
    const chunks = chunkText(text, { chunkSize: 12, chunkOverlap: 4 })
    expect(chunks.length).toBeGreaterThan(1)
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].length).toBeGreaterThan(0)
    }
  })

  it('handles empty text', () => {
    const chunks = chunkText('', { chunkSize: 100, chunkOverlap: 0 })
    expect(chunks).toEqual([])
  })

  it('handles text shorter than overlap', () => {
    const chunks = chunkText('hi', { chunkSize: 100, chunkOverlap: 50 })
    expect(chunks).toEqual(['hi'])
  })

  it('uses custom split function when provided', () => {
    const customSplit = (text: string) => text.split('\n\n')
    const text = 'paragraph one\n\nparagraph two\n\nparagraph three'
    const chunks = chunkText(text, { chunkSize: 100, chunkOverlap: 0, split: customSplit })
    expect(chunks).toEqual(['paragraph one', 'paragraph two', 'paragraph three'])
  })

  it('custom split ignores chunkSize and overlap', () => {
    const customSplit = (text: string) => text.split('|')
    const text = 'a|b|c'
    const chunks = chunkText(text, { chunkSize: 1, chunkOverlap: 0, split: customSplit })
    expect(chunks).toEqual(['a', 'b', 'c'])
  })

  it('filters empty chunks from custom split', () => {
    const customSplit = (text: string) => text.split('|')
    const text = 'a||b'
    const chunks = chunkText(text, { chunkSize: 100, chunkOverlap: 0, split: customSplit })
    expect(chunks).toEqual(['a', 'b'])
  })
})
