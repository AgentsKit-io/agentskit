---
"@agentskit/core": patch
---

Keep the memory-record validator out of the main entry's static import graph: `createLocalStorageMemory().load()` now loads it lazily. The size gate now measures the real ESM import cost (index plus the shared chunks it imports), which is 9.3 KB gzipped, down from 10.5 KB.
