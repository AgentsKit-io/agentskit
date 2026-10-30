## Fallback: workspaces kept on typescript ^6 (#1889)

Root and `apps/*` (except docs-next) use ^7. Kept on ^6.0.3:

| Workspace | Tool | Error / constraint under TS 7 |
|---|---|---|
| `packages/*` | tsup `dts: true` → rollup-plugin-dts 6.1.1 | `TypeError: Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')` (TS 7 has no JS compiler API: `ts.sys`, `createProgram`) |
| `apps/docs-next` | typedoc | peer `typescript` range ends at `6.0.x` |
| `packages/angular` | @angular/compiler-cli, ng-packagr | peer `typescript` `>=6.0 <6.1` |
| `packages/svelte` | svelte2tsx | peer `typescript` `^4.9.4 \|\| ^5.0.0 \|\| ^6.0.0` |
