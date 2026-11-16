import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkCoreImports, checkDirection, findImports } from './check-core-imports.mjs'

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), 'ak-core-imports-'))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}
const coreSrc = content => ({ 'packages/core/src/a.ts': content })

describe('core import boundary', () => {
  it.each([
    ["import OpenAI from 'openai'", 'openai'],
    ["import { x } from '@agentskit/adapters'", '@agentskit/adapters'],
    ["import { readFile } from 'node:fs'", 'node:fs'],
    ["const m = await import('openai')", 'openai'],
    ["export * from 'openai'", 'openai'],
    ["import { x } from 'json-schema'", 'json-schema'],
  ])('fails %s with file:line', async (code, spec) => {
    const root = await fixture(coreSrc(`const a = 1\n${code}\n`))
    try {
      const errors = checkCoreImports(root)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatch(/^packages\/core\/src\/a\.ts:2:/)
      expect(errors[0]).toContain(spec)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('accepts the charter allowlist, type-only json-schema, comments and tests', async () => {
    const root = await fixture({
      ...coreSrc(
        [
          "import type { JSONSchema7 } from 'json-schema'",
          "import canonicalize from 'canonicalize'",
          "import { sha256 } from '@noble/hashes/sha2.js'",
          "import { y } from './b'",
          "// import x from 'openai'",
          " * import { z } from '@agentskit/core'",
        ].join('\n'),
      ),
      'packages/core/src/a.test.ts': "import fs from 'node:fs'",
    })
    try {
      expect(checkCoreImports(root)).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('finds multi-line and dynamic specifiers', () => {
    const found = findImports("\n\nimport {\n a,\n b,\n} from 'x'\nconst c = import('y')\n")
    expect(found.map(f => [f.specifier, f.line])).toEqual([['x', 3], ['y', 7]])
  })

  it('fails when core depends on @agentskit/* or packages form a cycle', async () => {
    const pkg = (name, deps = {}, peer = {}) => JSON.stringify({ name, dependencies: deps, peerDependencies: peer })
    const root = await fixture({
      'packages/core/package.json': pkg('@agentskit/core', { '@agentskit/a': '1' }),
      'packages/a/package.json': pkg('@agentskit/a', {}, { '@agentskit/b': '1' }),
      'packages/b/package.json': pkg('@agentskit/b', { '@agentskit/a': '1' }),
    })
    try {
      const errors = checkDirection(root)
      expect(errors.some(e => e.includes('core must not depend'))).toBe(true)
      expect(errors.some(e => e.includes('dependency cycle'))).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('passes on the current repository', () => {
    expect(checkCoreImports(process.cwd())).toEqual([])
    expect(checkDirection(process.cwd())).toEqual([])
  })
})
