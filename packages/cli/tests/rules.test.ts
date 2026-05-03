import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeRules } from '../src/rules'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'agentskit-rules-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('writeRules — cursor', () => {
  it('writes .cursor/rules/agentskit.mdc on first run', async () => {
    const [r] = await writeRules('cursor', { rootDir: root })
    expect(r.editor).toBe('cursor')
    expect(r.files).toHaveLength(1)
    expect(r.files[0].action).toBe('wrote')
    const body = readFileSync(r.files[0].path, 'utf8')
    expect(body).toContain('alwaysApply: true')
    expect(body).toContain('AgentsKit project rules')
  })

  it('skips when contents unchanged', async () => {
    await writeRules('cursor', { rootDir: root })
    const [r] = await writeRules('cursor', { rootDir: root })
    expect(r.files[0].action).toBe('skipped')
  })

  it('overwrites with --force when contents differ', async () => {
    await writeRules('cursor', { rootDir: root })
    writeFileSync(join(root, '.cursor/rules/agentskit.mdc'), 'tampered', 'utf8')
    const [r] = await writeRules('cursor', { rootDir: root, force: true })
    expect(r.files[0].action).toBe('updated')
    expect(readFileSync(r.files[0].path, 'utf8')).toContain('alwaysApply: true')
  })

  it('refuses to overwrite without --force when contents differ', async () => {
    await writeRules('cursor', { rootDir: root })
    writeFileSync(join(root, '.cursor/rules/agentskit.mdc'), 'tampered', 'utf8')
    const [r] = await writeRules('cursor', { rootDir: root })
    expect(r.files[0].action).toBe('skipped')
    expect(readFileSync(r.files[0].path, 'utf8')).toBe('tampered')
  })
})

describe('writeRules — windsurf', () => {
  it('writes .windsurfrules', async () => {
    const [r] = await writeRules('windsurf', { rootDir: root })
    expect(r.files[0].path).toBe(join(root, '.windsurfrules'))
    expect(readFileSync(r.files[0].path, 'utf8')).toContain('AgentsKit project rules')
  })
})

describe('writeRules — codex (AGENTS.md profile block)', () => {
  it('writes a fresh AGENTS.md when none exists', async () => {
    const [r] = await writeRules('codex', { rootDir: root })
    expect(r.files[0].action).toBe('wrote')
    const body = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(body).toContain('agentskit-codex-profile:start')
    expect(body).toContain('profile: agentskit')
  })

  it('appends the block to an existing AGENTS.md only with --force', async () => {
    writeFileSync(join(root, 'AGENTS.md'), '# AGENTS\n\nExisting guidance.\n', 'utf8')
    const [skip] = await writeRules('codex', { rootDir: root })
    expect(skip.files[0].action).toBe('skipped')
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).not.toContain('agentskit-codex-profile')

    const [forced] = await writeRules('codex', { rootDir: root, force: true })
    expect(forced.files[0].action).toBe('updated')
    const body = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(body).toContain('Existing guidance.')
    expect(body).toContain('agentskit-codex-profile:start')
  })

  it('requires --force even for in-place block replacement on a populated AGENTS.md', async () => {
    writeFileSync(
      join(root, 'AGENTS.md'),
      '# AGENTS\n\n<!-- agentskit-codex-profile:start -->\nold profile\n<!-- agentskit-codex-profile:end -->\n\nTrailing.\n',
      'utf8',
    )
    const [skip] = await writeRules('codex', { rootDir: root })
    expect(skip.files[0].action).toBe('skipped')
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toContain('old profile')

    const [forced] = await writeRules('codex', { rootDir: root, force: true })
    expect(forced.files[0].action).toBe('updated')
    const body = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(body).toContain('profile: agentskit')
    expect(body).not.toContain('old profile')
    expect(body).toContain('Trailing.')
  })

  it('collapses duplicate-pasted blocks into one (uses last :end)', async () => {
    writeFileSync(
      join(root, 'AGENTS.md'),
      [
        '# AGENTS\n',
        '<!-- agentskit-codex-profile:start -->',
        'OLD_BLOCK_ONE_MARKER',
        '<!-- agentskit-codex-profile:end -->',
        '<!-- agentskit-codex-profile:start -->',
        'OLD_BLOCK_TWO_MARKER',
        '<!-- agentskit-codex-profile:end -->',
        'TRAILING_MARKER',
      ].join('\n'),
      'utf8',
    )
    const [r] = await writeRules('codex', { rootDir: root, force: true })
    expect(r.files[0].action).toBe('updated')
    const body = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(body.match(/agentskit-codex-profile:start/g) ?? []).toHaveLength(1)
    expect(body.match(/agentskit-codex-profile:end/g) ?? []).toHaveLength(1)
    expect(body).not.toContain('OLD_BLOCK_ONE_MARKER')
    expect(body).not.toContain('OLD_BLOCK_TWO_MARKER')
    expect(body).toContain('TRAILING_MARKER')
  })

  it('refuses to modify a half-edited block (start without end)', async () => {
    writeFileSync(
      join(root, 'AGENTS.md'),
      '# AGENTS\n\n<!-- agentskit-codex-profile:start -->\ntruncated\n',
      'utf8',
    )
    await expect(writeRules('codex', { rootDir: root, force: true })).rejects.toThrow(
      /half-edited block/,
    )
  })

  it('skips when the profile block already matches', async () => {
    await writeRules('codex', { rootDir: root })
    const [r] = await writeRules('codex', { rootDir: root })
    expect(r.files[0].action).toBe('skipped')
  })
})

describe('writeRules — claude-code (skill + slash commands)', () => {
  it('writes the SKILL.md to .claude/skills/ AND slash commands to .claude/commands/', async () => {
    const [r] = await writeRules('claude-code', { rootDir: root })
    const paths = r.files.map(f => f.path)
    expect(paths).toContain(join(root, '.claude', 'skills', 'agentskit', 'SKILL.md'))
    // Slash commands live at .claude/commands/<name>.md (NOT inside the skill folder)
    expect(paths).toContain(join(root, '.claude', 'commands', 'agentskit-doctor.md'))
    expect(paths).toContain(join(root, '.claude', 'commands', 'agentskit-new-agent.md'))
    expect(paths).toContain(join(root, '.claude', 'commands', 'agentskit-rules.md'))

    const skill = readFileSync(join(root, '.claude/skills/agentskit/SKILL.md'), 'utf8')
    expect(skill).toContain('name: agentskit')

    const cmd = readFileSync(join(root, '.claude/commands/agentskit-doctor.md'), 'utf8')
    expect(cmd).toContain('description: Run the AgentsKit environment doctor')
  })
})

describe('writeRules — all', () => {
  it('runs every editor in one pass', async () => {
    const results = await writeRules('all', { rootDir: root })
    expect(results.map(r => r.editor)).toEqual(['cursor', 'windsurf', 'codex', 'claude-code'])
    for (const r of results) {
      expect(r.files.length).toBeGreaterThan(0)
    }
  })
})
