import type { Options } from 'tsup'

export const sharedTsupOptions = {
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  treeshake: true,
} satisfies Pick<Options, 'format' | 'dts' | 'sourcemap' | 'treeshake'>
