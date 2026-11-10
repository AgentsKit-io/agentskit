import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')
const SAVE_GUARD = "github.event_name == 'push' && github.ref == 'refs/heads/main'"

const files = [
  ...readdirSync('.github/workflows').map((f) => `.github/workflows/${f}`),
  '.github/actions/playwright-browsers/action.yml',
  '.github/actions/pnpm-store-cache/action.yml',
]

describe('playwright-browsers action', () => {
  const action = read('.github/actions/playwright-browsers/action.yml')
  it('restores the cache, saves only on main, installs deps on a hit', () => {
    expect(action).toContain('actions/cache/restore@')
    expect(action).toMatch(/cache-hit == 'true'\n\s+shell: bash\n\s+run: pnpm exec playwright install-deps chromium/)
    const save = action.slice(action.indexOf('actions/cache/save@') - 300)
    expect(save).toContain(SAVE_GUARD)
    expect(action).not.toMatch(/uses: actions\/cache@/)
  })
})

describe('no workflow saves caches on pull requests', () => {
  it.each(files)('%s guards every cache save with push to main', (file) => {
    const lines = read(file).split('\n')
    expect(read(file)).not.toMatch(/uses: actions\/cache@/)
    lines.forEach((line, i) => {
      if (!line.includes('actions/cache/save@')) return
      const step = lines.slice(Math.max(0, i - 4), i + 1).join('\n')
      expect(step, `${file}:${i + 1}`).toContain(SAVE_GUARD)
    })
  })
})

describe('coverage workflow', () => {
  const wf = read('.github/workflows/coverage.yml')
  it('runs the suite only on push to main and on schedule', () => {
    expect(wf).toMatch(/push:\n\s+branches: \[main\]/)
    expect(wf).toContain('schedule:')
    expect(wf).toContain("if: github.event_name != 'pull_request'")
  })
})

describe('gitleaks workflow', () => {
  const wf = read('.github/workflows/gitleaks.yml')
  it('runs on every PR and push with a pinned, checksummed binary and redacted output', () => {
    expect(wf).toMatch(/pull_request:\n\s+branches: \[main\]/)
    expect(wf).toMatch(/push:\n\s+branches: \[main\]/)
    expect(wf).toMatch(/GITLEAKS_VERSION: \d+\.\d+\.\d+/)
    expect(wf).toMatch(/GITLEAKS_SHA256: [0-9a-f]{64}/)
    expect(wf).toContain('sha256sum -c -')
    expect(wf).toContain('--redact')
  })
})
