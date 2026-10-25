import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    mcp: 'src/mcp/index.ts',
    integrations: 'src/integrations/index.ts',
    'mcp-devtools': 'src/mcp-devtools/index.ts',
    validation: '../validation/src/index.ts',
  },
  clean: false,
  noExternal: ['ajv'],
})
