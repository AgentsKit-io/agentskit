export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
        outDir: 'dist',
      },
      include: ['src'],
    },
    null,
    2,
  )
}

/**
 * tsup's `defineConfig` default export is a build-tool convention — the only
 * intentional default export in generated packages. Package source
 * (`src/index.ts`) always uses named exports.
 */
export function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
})
`
}
