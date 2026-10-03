import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    'trace-tracker': 'src/trace-tracker.ts',
    'cost-guard': 'src/cost-guard.ts',
    langfuse: '../observability-langfuse/src/index.ts',
  },
  clean: true,
  minify: true,
  external: [
    '@agentskit/observability',
    'langfuse',
    'langsmith',
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/exporter-trace-otlp-http',
  ],
})
