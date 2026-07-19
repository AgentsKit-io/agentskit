---
'@agentskit/templates': minor
---

Harden the beta templates surface without promoting it to stable. `scaffold` now validates type/name/dir/description before any write (unscoped kebab-case names only), refuses symlink destinations, stages into a sibling directory and renames atomically, fails on collisions unless `overwrite: true` (backup + rollback), and returns final paths only. Factories require trim-non-empty identity fields, function `execute`/`createSource`, plain JSON Schema objects, and finite optional temperature; adapter `capabilities` and skill `metadata` pass through. Generated packages pin `@agentskit/core ^1.0.0` (flow also `@agentskit/runtime ^0.10.0`) with no wildcards or unused deps, set engines/license/sideEffects, use tsup `clean: true`, named source exports, and a corrected memory-chat `MemoryRecord` contract. Scoped package names remain unsupported until a future beta migration.
