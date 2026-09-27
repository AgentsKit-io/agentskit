import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as pure from '../src/pure'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

describe('@agentskit/cross-platform/pure', () => {
  it('exposes the browser-safe API', () => {
    expect(Object.keys(pure).sort()).toEqual(
      [
        'basename', 'dirname', 'extname', 'getRuntimeInfo', 'hashText', 'isAbsolutePath', 'isBun', 'isDeno', 'isLinux',
        'isMacOS', 'isPathInside', 'isWindows', 'isWindowsStylePath', 'joinPosix', 'normalizeEol', 'normalizePosix',
        'relativePosix', 'resolvePosix', 'samePath', 'splitFrontmatter', 'splitLines', 'stripBom', 'toPosix',
      ].sort(),
    )
  })

  it('never imports node: builtins', async () => {
    for (const file of ['pure.ts', 'runtime.ts', 'paths.ts', 'text.ts']) {
      expect(await readFile(join(src, file), 'utf8')).not.toMatch(/from '(?:node:)?(?:fs|path|os|url|child_process)'/)
    }
  })
})
