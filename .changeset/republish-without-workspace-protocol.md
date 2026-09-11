---
'@agentskit/adapters': patch
'@agentskit/angular': patch
'@agentskit/cli': patch
'@agentskit/eval': patch
'@agentskit/ink': patch
'@agentskit/integrations': patch
'@agentskit/mcp': patch
'@agentskit/memory': patch
'@agentskit/observability': patch
'@agentskit/rag': patch
'@agentskit/react': patch
'@agentskit/react-native': patch
'@agentskit/runtime': patch
'@agentskit/sandbox': patch
'@agentskit/skills': patch
'@agentskit/solid': patch
'@agentskit/svelte': patch
'@agentskit/templates': patch
'@agentskit/tools': patch
'@agentskit/vue': patch
---

Republish with real version ranges for internal dependencies. The previous releases were published through `npm publish`, which left `"@agentskit/core": "workspace:*"` (and other `workspace:*` ranges) in the published manifests, so installing them outside this monorepo failed with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` / `EUNSUPPORTEDPROTOCOL`. The release now resolves `workspace:` ranges before publishing and fails if a packed manifest still contains them.
