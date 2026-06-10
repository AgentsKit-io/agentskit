import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// bin.ts is a CLI entry (process.argv parsing + server bootstrap); its logic
// lives in index.ts / agent-tool.ts / registry-fetch.ts, which are tested.
const base = createTestConfig({ linesThreshold: 80 })
base.test!.coverage!.exclude = [...(base.test!.coverage!.exclude ?? []), 'src/bin.ts']
export default defineConfig(base)
