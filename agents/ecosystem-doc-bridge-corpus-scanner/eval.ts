import type { EvalSuite } from '@agentskit/eval'

export const suite: EvalSuite = {
  name: 'ecosystem-doc-bridge-corpus-scanner',
  cases: [
    {
      input: `Corpus files:
- packages/auth.md (updated last week)
- packages/runtime.md (stale — last touched 2023)
- docs/getting-started.md`,
      expected: (r: string) => {
        const j = JSON.parse(r)
        return j.scannedPaths.length >= 2 && j.scannedPaths.some((p: { staleness: string }) => p.staleness === 'stale')
      },
    },
    {
      input: 'Minimal input.',
      expected: (r: string) => {
        const j = JSON.parse(r)
        return j.scannedPaths.length === 0 && j.gaps.length > 0
      },
    },
    {
      input: 'Single file: AGENTS.md at repo root, fresh.',
      expected: (r: string) => /AGENTS\.md/i.test(r) && /agent-doc|fresh/i.test(r),
    },
    {
      input: 'Empty context — only says "process this".',
      expected: (r: string) => /gap/i.test(r) && /requiresReview":true/.test(r),
    },
  ],
}
