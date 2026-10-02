import { describe, expect, it } from 'vitest'
import {
  extractWikilinks,
  findSection,
  normalize,
  parseNote,
  parseTable,
  plain,
  sections,
  splitFrontmatter,
  stripWikilinks,
} from '../src/markdown'

describe('splitFrontmatter', () => {
  it('parses a YAML mapping and returns the remaining body', () => {
    const raw = '---\ntitle: Weekly plan\ntags: [alpha, beta]\ndate: 2026-01-05\n---\n# Body\n'
    expect(splitFrontmatter(raw)).toEqual({
      frontmatter: { title: 'Weekly plan', tags: ['alpha', 'beta'], date: '2026-01-05' },
      body: '# Body\n',
    })
  })

  it('returns the raw text when there is no frontmatter', () => {
    expect(splitFrontmatter('# Only body')).toEqual({ frontmatter: {}, body: '# Only body' })
    expect(splitFrontmatter('text\n---\nx: 1\n---\n')).toEqual({ frontmatter: {}, body: 'text\n---\nx: 1\n---\n' })
  })

  it('handles CRLF, a BOM, empty blocks and a closing fence at EOF', () => {
    expect(splitFrontmatter('﻿---\r\na: 1\r\n---\r\nbody')).toEqual({ frontmatter: { a: 1 }, body: 'body' })
    expect(splitFrontmatter('---\n---\nbody')).toEqual({ frontmatter: {}, body: 'body' })
    expect(splitFrontmatter('---\na: 1\n---')).toEqual({ frontmatter: { a: 1 }, body: '' })
  })

  it('ignores non-mapping YAML documents', () => {
    expect(splitFrontmatter('---\n- a\n- b\n---\nbody').frontmatter).toEqual({})
    expect(splitFrontmatter('---\njust text\n---\nbody').frontmatter).toEqual({})
  })

  it('reports invalid YAML without throwing', () => {
    const out = splitFrontmatter('---\na: [unclosed\n---\nbody')
    expect(out.frontmatter).toEqual({})
    expect(out.body).toBe('body')
    expect(out.frontmatterError).toEqual(expect.any(String))
  })
})

describe('wikilinks', () => {
  const text = 'See [[Alpha]], [[Beta|the beta]], [[Gamma#Intro]], ![[diagram.png]], [[Alpha]] and [[#Local]]. In a table: [[Delta\\|D]].'

  it('extracts unique targets in order, skipping same-note links', () => {
    expect(extractWikilinks(text)).toEqual(['Alpha', 'Beta', 'Gamma', 'diagram.png', 'Delta'])
  })

  it('replaces links by alias, target, or same-note heading', () => {
    expect(stripWikilinks(text)).toBe(
      'See Alpha, the beta, Gamma, diagram.png, Alpha and Local. In a table: D.',
    )
  })

  it('leaves an empty link untouched', () => {
    expect(stripWikilinks('[[]]')).toBe('[[]]')
    expect(extractWikilinks('[[ ]]')).toEqual([])
  })
})

describe('sections', () => {
  const body = [
    'Intro line',
    '# Title',
    'Top',
    '## Próximos passos ##',
    '- one',
    '```md',
    '# not a heading',
    '```',
    '~~~',
    '## also not',
    '~~~',
    '### Deep',
    'deep text',
    '#nospace',
  ].join('\n')

  it('splits by ATX heading and ignores headings inside fences', () => {
    expect(sections(body)).toEqual([
      { level: 0, heading: '', content: 'Intro line' },
      { level: 1, heading: 'Title', content: 'Top' },
      {
        level: 2,
        heading: 'Próximos passos',
        content: '- one\n```md\n# not a heading\n```\n~~~\n## also not\n~~~',
      },
      { level: 3, heading: 'Deep', content: 'deep text\n#nospace' },
    ])
  })

  it('finds a section case- and accent-insensitively', () => {
    expect(findSection(body, 'PROXIMOS')?.heading).toBe('Próximos passos')
    expect(findSection(body, 'missing')).toBeNull()
  })

  it('does not close a fence with a shorter or different marker', () => {
    const out = sections('````\n```\n# inside\n````\n# Out')
    expect(out.map((s) => s.heading)).toEqual(['', 'Out'])
  })
})

describe('heading edge cases', () => {
  it('strips closing sequences only when separated by whitespace', () => {
    const out = sections('# C# notes\n## Closed ##\t\n###\n####### seven\n#\tTabbed')
    expect(out.map((s) => [s.level, s.heading])).toEqual([
      [0, ''],
      [1, 'C# notes'],
      [2, 'Closed'],
      [3, ''],
      [1, 'Tabbed'],
    ])
    expect(out[3]?.content).toBe('####### seven')
  })
})

describe('linear time on adversarial input', () => {
  it('handles long runs of brackets, tabs, spaces and pipes quickly', () => {
    const n = 50_000
    const start = performance.now()
    extractWikilinks('[['.repeat(n) + '\\'.repeat(n))
    stripWikilinks('[[\\'.repeat(n))
    sections('#' + '\t'.repeat(n) + 'x' + '\t'.repeat(n) + '#')
    parseTable('|' + ' '.repeat(n) + '|\n|' + ' '.repeat(n) + '-' + ' '.repeat(n))
    expect(performance.now() - start).toBeLessThan(2000)
  })
})

describe('parseTable', () => {
  it('parses the first GitHub table with escaped and wikilink pipes', () => {
    const text = [
      'Before',
      '| **Name** | Link | Notes |',
      '| :--- | :---: | ---: |',
      '| one | [[Alpha\\|A]] | a \\| b |',
      '| two | [[Beta|B]] |',
      '',
      '| Other | Table |',
      '| --- | --- |',
      '| x | y |',
    ].join('\n')
    expect(parseTable(text)).toEqual([
      { Name: 'one', Link: '[[Alpha|A]]', Notes: 'a | b' },
      { Name: 'two', Link: '[[Beta|B]]' },
    ])
  })

  it('names missing headers col<i> and requires a delimiter row', () => {
    expect(parseTable('| a | |\n|---|---|\n| 1 | 2 | 3 |')).toEqual([{ a: '1', col1: '2', col2: '3' }])
    expect(parseTable('| a | b |\n| 1 | 2 |')).toEqual([])
    expect(parseTable('no table')).toEqual([])
  })
})

describe('normalize / plain', () => {
  it('normalizes case, accents and whitespace', () => {
    expect(normalize('  Ação ')).toBe('acao')
    expect(normalize(undefined)).toBe('')
  })

  it('strips emphasis, code markers and wikilinks', () => {
    expect(plain('**Bold** _x_ `code` *em* [[A|alias]]')).toBe('Bold _x_ code em alias')
    expect(plain(null)).toBe('')
  })
})

describe('parseNote', () => {
  it('combines frontmatter, title, body and links (frontmatter links included)', () => {
    const raw = '---\nrelated: "[[Project X]]"\n---\n```\n# fenced\n```\n# Real title\nLinks to [[Beta]].'
    expect(parseNote('notes/sub/file.md', raw)).toEqual({
      path: 'notes/sub/file.md',
      title: 'Real title',
      frontmatter: { related: '[[Project X]]' },
      body: '```\n# fenced\n```\n# Real title\nLinks to [[Beta]].',
      links: ['Project X', 'Beta'],
    })
  })

  it('falls back to the file name and surfaces frontmatter errors', () => {
    const note = parseNote('notes\\Daily Note.MD', '---\nbad: [\n---\nno heading')
    expect(note.title).toBe('Daily Note')
    expect(note.frontmatterError).toEqual(expect.any(String))
    expect(parseNote('plain', 'x').title).toBe('plain')
  })
})
