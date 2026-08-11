import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from '../../../scripts/compute-stats.mjs'

const read = path => readFileSync(join(REPO_ROOT, path), 'utf8')

test('the Vercel AI provider guide matches the route adapter contract', () => {
  const guide = read('apps/docs-next/content/docs/data/providers/vercel-ai.mdx')
  const source = read('packages/adapters/src/vercel-ai.ts')
  const routeExample = guide.match(/```ts title="app\/api\/chat\/route\.ts"\n([\s\S]*?)\n```/)?.[1]

  assert.match(source, /export interface VercelAIConfig\s*{\s*api: string/)
  assert.match(guide, /vercelAI\(\{\s*api: '\/api\/chat'/)
  assert.ok(routeExample)
  assert.match(routeExample, /const\s+\{\s*messages,\s*systemPrompt\s*\}/)
  assert.match(routeExample, /streamText\(\{[\s\S]*?system:\s*systemPrompt,[\s\S]*?messages,/)
  assert.match(routeExample, /return result\.toUIMessageStreamResponse\(\)/)
  assert.match(guide, /x-vercel-ai-ui-message-stream: v1/)
  assert.match(routeExample, /\| \{ role: 'user'; content: string \}/)
  assert.match(routeExample, /\| \{ role: 'assistant'; content: string \}/)
  assert.match(routeExample, /\| \{ role: 'system'; content: string \}/)
  assert.match(guide, /does not preserve AgentsKit `toolCallId` values/)
  assert.match(guide, /Use a direct provider adapter when the AgentsKit runtime must own the tool loop/)
  assert.match(guide, /\| `headers` \| `Record<string, string>`/)
  assert.match(guide, /\| `retry` \| `RetryOptions`/)
  assert.doesNotMatch(guide, /vercelAI\(\{\s*model:/)
  assert.doesNotMatch(routeExample, /ModelMessage/)
  assert.doesNotMatch(guide, /Wrap a Vercel AI SDK `LanguageModel`/)
})
