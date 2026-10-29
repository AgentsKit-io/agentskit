---
name: reference_typescript-7-fallback
description: Why packages/* and apps/docs-next stay on typescript ^6 while root and example apps use ^7
metadata:
  type: reference
---

Root and example apps use `typescript ^7`; `packages/*` and `apps/docs-next` stay on `^6.0.3`.

Tried bumping every `packages/*` to `^7.0.2` (2026-10-29, #1889). `pnpm install` and `tsc --noEmit` work,
but `pnpm build` fails in every package using tsup `dts: true`:

    TypeError: Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')
        at rollup-plugin-dts@6.1.1 (bundled in tsup 8.5.1)

TS 7 (native) exports `./lib/version.cjs` as `typescript`, with no JS compiler API (`ts.sys`, `createProgram`),
which rollup-plugin-dts needs. Also unsupported as TS 7 peers: typedoc (apps/docs-next), @angular/compiler-cli,
ng-packagr, svelte2tsx.

**How to apply:** retry only once tsup/rollup-plugin-dts supports TS 7 (or the build moves off tsup dts).
Keep the `typescript-5-9` alias as is.
