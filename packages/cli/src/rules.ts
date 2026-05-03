import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import { CURSOR_RULE } from './rules/cursor'
import { WINDSURF_RULE } from './rules/windsurf'
import { CODEX_PROFILE } from './rules/codex'
import { CLAUDE_CODE_SKILL, CLAUDE_CODE_SLASH_COMMANDS } from './rules/claude-code'

export type Editor = 'cursor' | 'windsurf' | 'codex' | 'claude-code' | 'all'

export interface RulesWriteResult {
  editor: Editor
  files: Array<{ path: string; action: 'wrote' | 'skipped' | 'updated' }>
}

const CODEX_BLOCK_START = '<!-- agentskit-codex-profile:start -->'
const CODEX_BLOCK_END = '<!-- agentskit-codex-profile:end -->'

async function ensureDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
}

async function writeIfChanged(
  absPath: string,
  contents: string,
  force: boolean,
): Promise<'wrote' | 'skipped' | 'updated'> {
  let existing: string | undefined
  try {
    existing = await readFile(absPath, 'utf8')
  } catch {
    // not present
  }
  if (existing === contents) return 'skipped'
  if (existing !== undefined && !force) {
    // Append-or-update flow handled by callers that need it; default
    // here is to overwrite when contents differ AND force is on.
    return 'skipped'
  }
  await ensureDir(absPath)
  await writeFile(absPath, contents, 'utf8')
  return existing === undefined ? 'wrote' : 'updated'
}

async function writeCursor(rootDir: string, force: boolean): Promise<RulesWriteResult['files']> {
  const path = join(rootDir, '.cursor', 'rules', 'agentskit.mdc')
  const action = await writeIfChanged(path, CURSOR_RULE, force)
  return [{ path, action }]
}

async function writeWindsurf(rootDir: string, force: boolean): Promise<RulesWriteResult['files']> {
  const path = join(rootDir, '.windsurfrules')
  const action = await writeIfChanged(path, WINDSURF_RULE, force)
  return [{ path, action }]
}

/**
 * Codex profile is appended to the existing AGENTS.md, replacing any
 * previous profile block delimited by the sentinel comments. If
 * AGENTS.md does not exist, write it with just the profile (deployers
 * are expected to add the rest of the universal-agent guidance).
 *
 * Sentinel parsing rules:
 *  - Search the END sentinel only AFTER the START sentinel — prevents
 *    a stray `:end -->` inside YAML content from pulling the slice to
 *    the wrong position.
 *  - Find the LAST end after the start so a duplicate-paste of the
 *    block collapses into one rather than half-overwriting.
 *  - Refuse to modify if a START sentinel is present without any END
 *    after it (file truncated mid-block) — the user has hand-edited
 *    something we don't understand and we should not append on top.
 *  - Require --force for ANY write to a populated AGENTS.md (in-place
 *    block update OR first-time append). AGENTS.md is load-bearing
 *    and every codex run on a populated one must be opt-in.
 */
async function writeCodex(rootDir: string, force: boolean): Promise<RulesWriteResult['files']> {
  const path = join(rootDir, 'AGENTS.md')
  let existing = ''
  try {
    existing = await readFile(path, 'utf8')
  } catch {
    // not present — write a fresh AGENTS.md with just the profile.
  }
  const startIdx = existing.indexOf(CODEX_BLOCK_START)
  const endIdx =
    startIdx >= 0
      ? existing.lastIndexOf(CODEX_BLOCK_END, existing.length)
      : -1
  if (startIdx >= 0 && endIdx <= startIdx) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${path}: found agentskit-codex-profile:start sentinel but no matching :end after it — refusing to modify a half-edited block.`,
      hint: 'Restore the closing sentinel or remove the partial block, then re-run.',
    })
  }
  let next: string
  if (startIdx >= 0 && endIdx > startIdx) {
    next =
      existing.slice(0, startIdx) +
      CODEX_PROFILE.trimEnd() +
      existing.slice(endIdx + CODEX_BLOCK_END.length)
  } else if (existing) {
    next = `${existing.replace(/\s+$/, '')}\n\n${CODEX_PROFILE}`
  } else {
    next = CODEX_PROFILE
  }
  if (next === existing) return [{ path, action: 'skipped' }]
  if (existing && !force) {
    return [{ path, action: 'skipped' }]
  }
  await ensureDir(path)
  await writeFile(path, next, 'utf8')
  return [{ path, action: existing ? 'updated' : 'wrote' }]
}

async function writeClaudeCode(rootDir: string, force: boolean): Promise<RulesWriteResult['files']> {
  const out: RulesWriteResult['files'] = []
  // Skill bundle (.claude/skills/<name>/SKILL.md) — Claude Code skill format.
  const skillRoot = join(rootDir, '.claude', 'skills', 'agentskit')
  for (const file of CLAUDE_CODE_SKILL) {
    const abs = join(skillRoot, file.path)
    const action = await writeIfChanged(abs, file.contents, force)
    out.push({ path: abs, action })
  }
  // Project-scoped slash commands (.claude/commands/*.md) — Claude Code's
  // actual location for `/<name>` invocations. Skill bundles do not
  // register slash commands automatically; the two surfaces are separate.
  const commandsRoot = join(rootDir, '.claude', 'commands')
  for (const cmd of CLAUDE_CODE_SLASH_COMMANDS) {
    const abs = join(commandsRoot, cmd.path)
    const action = await writeIfChanged(abs, cmd.contents, force)
    out.push({ path: abs, action })
  }
  return out
}

export async function writeRules(
  editor: Editor,
  options: { rootDir?: string; force?: boolean } = {},
): Promise<RulesWriteResult[]> {
  const root = resolve(options.rootDir ?? process.cwd())
  const force = options.force === true
  if (editor === 'all') {
    return [
      { editor: 'cursor', files: await writeCursor(root, force) },
      { editor: 'windsurf', files: await writeWindsurf(root, force) },
      { editor: 'codex', files: await writeCodex(root, force) },
      { editor: 'claude-code', files: await writeClaudeCode(root, force) },
    ]
  }
  switch (editor) {
    case 'cursor':
      return [{ editor, files: await writeCursor(root, force) }]
    case 'windsurf':
      return [{ editor, files: await writeWindsurf(root, force) }]
    case 'codex':
      return [{ editor, files: await writeCodex(root, force) }]
    case 'claude-code':
      return [{ editor, files: await writeClaudeCode(root, force) }]
  }
}
