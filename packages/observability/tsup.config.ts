import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'trace-tracker': 'src/trace-tracker.ts',
    'cost-guard': 'src/cost-guard.ts',
    langfuse: '../observability-langfuse/src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  external: [
    '@agentskit/observability',
    'langfuse',
    'langsmith',
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/exporter-trace-otlp-http',
  ],
})
