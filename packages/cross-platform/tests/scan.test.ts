import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { removePath } from '../src/fs'
import { scanRepository } from '../src/lint/scan'

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ak-scan-'))
  await mkdir(join(root, 'packages', 'a', 'src'), { recursive: true })
  await mkdir(join(root, 'packages', 'a', 'node_modules', 'dep'), { recursive: true })
  await mkdir(join(root, 'packages', 'lib', 'src'), { recursive: true })
  await writeFile(join(root, 'packages', 'a', 'src', 'run.ts'), "import { spawn } from 'node:child_process'\n")
  await writeFile(join(root, 'packages', 'a', 'src', 'types.d.ts'), "import 'node:child_process'\n")
  await writeFile(join(root, 'packages', 'a', 'src', 'readme.md'), "import 'node:child_process'\n")
  await writeFile(join(root, 'packages', 'a', 'node_modules', 'dep', 'x.js'), "require('child_process')\n")
  await writeFile(join(root, 'packages', 'lib', 'src', 'spawn.ts'), "import 'node:child_process'\n")
})

afterAll(async () => {
  await removePath(root)
})

describe('scanRepository', () => {
  it('scans source files, skipping dependencies, declarations and excluded prefixes', async () => {
    const findings = await scanRepository({ root, include: ['packages', 'missing-dir'], exclude: ['packages/lib/'] })
    expect(findings.map(f => f.file)).toEqual(['packages/a/src/run.ts'])
  })
})
