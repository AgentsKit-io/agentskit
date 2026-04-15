import { test, expect } from '@playwright/test'
import { runNodeExample } from './helpers/dev-server'

test('runtime example — executes and produces assistant output', async () => {
  const { stdout, code } = await runNodeExample('@agentskit/example-runtime', 'dev', 30_000)
  expect(code).toBe(0)
  expect(stdout.length).toBeGreaterThan(0)
  // The example uses a deterministic demo adapter and prints at least
  // the final assistant message plus some metadata.
  expect(stdout).toMatch(/step|run|final|result|assistant/i)
})
