---
'@agentskit/cross-platform': patch
---

`killProcessTree` also signals the POSIX process group the pid leads, so descendants of a `detached: true` child whose parent already exited are killed too (the tree walk alone missed them). `agentskit-cross-platform check --baseline` accepts absolute paths.
