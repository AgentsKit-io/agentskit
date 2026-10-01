import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('NET rules CLI', () => {
  it('runs the built wrapper with ignores and refuses ratchet regressions', async () => {
    const repo = process.cwd()
    const root = await mkdtemp(join(tmpdir(), 'ak-net-rules-cli-'))
    const baseline = '.net-baseline.json'
    const run = args => {
      try {
        return {
          status: 0,
          stdout: execFileSync(process.execPath, [join(repo, 'scripts/check-net-rules.mjs'), ...args], {
            cwd: root,
            encoding: 'utf8',
          }),
          stderr: '',
        }
      } catch (error) {
        return { status: error.status, stdout: error.stdout, stderr: error.stderr }
      }
    }

    try {
      const src = join(root, 'packages/demo/src')
      const file = join(src, 'http.ts')
      await mkdir(src, { recursive: true })
      await writeFile(file, [
        // net-unbounded-body-ignore: synthetic CLI rule fixture.
        'const body = await response.text()',
        'const ignored = headers.get("retry-after") // net-retry-after-ignore: approved synthetic exception',
        // net-promise-race-timeout-ignore: synthetic CLI rule fixture.
        'return Promise.race([operation, setTimeout(abort, ms)])',
      ].join('\n'))

      const initialized = run(['--init', '--baseline', baseline])
      expect(initialized.status).toBe(0)
      expect(initialized.stdout).toContain('2 existing finding(s)')
      const allowed = JSON.parse(await readFile(join(root, baseline), 'utf8'))
      expect(allowed.entries['packages/demo/src/http.ts']).toEqual({
        'net-unbounded-body': 1,
        'net-promise-race-timeout': 1,
      })

      const clean = run(['--baseline', baseline])
      expect(clean.status).toBe(0)
      expect(clean.stdout).toContain('no new cross-platform issues (2 baselined)')

      // net-retry-after-ignore: the built CLI regression fixture adds this rule hit.
      await writeFile(file, `${await readFile(file, 'utf8')}\nconst delay = headers.get('retry-after')`)
      const regression = run(['--baseline', baseline])
      expect(regression.status).toBe(1)
      expect(regression.stderr).toContain('packages/demo/src/http.ts:4 [net-retry-after]')

      const update = run(['--update', '--baseline', baseline])
      expect(update.status).toBe(1)
      expect(update.stderr).toContain('Refusing to raise baseline counts')
      expect(JSON.parse(await readFile(join(root, baseline), 'utf8'))).toEqual(allowed)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
