/**
 * Sync guard: ensures useChat in @agentskit/ink stays identical to
 * @agentskit/react. Since both packages are React siblings (neither can
 * depend on the other without breaking the architecture), the hook is
 * intentionally duplicated. This test makes the duplication explicit and
 * catches accidental drift.
 *
 * If you need to change useChat logic, update BOTH files:
 *   - packages/react/src/useChat.ts
 *   - packages/ink/src/useChat.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Lines that are intentionally different between the two copies: the NOTE block
 * at the top of each file names the *other* file as the mirror target, so those
 * lines will always differ. Strip every contiguous comment line that forms the
 * leading NOTE block before comparing.
 */
function normalizeHook(raw: string): string {
  const lines = raw.split('\n')

  // Find where the leading NOTE block ends (first non-comment line)
  let firstNonComment = 0
  while (firstNonComment < lines.length && lines[firstNonComment].startsWith('//')) {
    firstNonComment++
  }

  return lines
    .slice(firstNonComment)
    .join('\n')
    .trim()
}

describe('useChat sync guard', () => {
  it('packages/ink/src/useChat.ts and packages/react/src/useChat.ts must be identical (ignoring mirror comments)', () => {
    const root = resolve(__dirname, '../../..')

    const inkContent = readFileSync(
      resolve(root, 'packages/ink/src/useChat.ts'),
      'utf8',
    )
    const reactContent = readFileSync(
      resolve(root, 'packages/react/src/useChat.ts'),
      'utf8',
    )

    const inkNormalized = normalizeHook(inkContent)
    const reactNormalized = normalizeHook(reactContent)

    expect(inkNormalized).toBe(reactNormalized)
  })
})
