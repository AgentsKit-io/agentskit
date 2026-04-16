---
'@agentskit/core': patch
'@agentskit/adapters': patch
'@agentskit/react': patch
'@agentskit/ink': patch
'@agentskit/cli': patch
'@agentskit/runtime': patch
'@agentskit/tools': patch
'@agentskit/skills': patch
'@agentskit/memory': patch
'@agentskit/rag': patch
'@agentskit/sandbox': patch
'@agentskit/observability': patch
'@agentskit/eval': patch
'@agentskit/templates': patch
---

docs: refresh npm READMEs to point at www.agentskit.io (retire legacy emersonbraun.github.io URL)

No code changes. Re-publish only — every package's README was migrated to www.agentskit.io in the Fumadocs rollout (#286, #313, #314) but the packages were never republished, so npmjs.com still surfaces the legacy GitHub Pages URL. This patch bump refreshes the published READMEs in one sweep.
