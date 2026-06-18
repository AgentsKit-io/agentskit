---
---

Internal: add the path-containment guard + transactional file writer (`packages/cli/src/components/install.ts`, RFC-0006 D16/D10). `assertContained`/`isSafeRegistryPath` reject absolute paths and `..` traversal (closing the write-escape vector that valid checksums don't catch); `commitFiles` validates every path + collects all conflicts before writing any file, then rolls back on failure. `IntegrityError` is a typed error (bare-throw gate compliant). Fully unit-tested. Not exported from the package entry yet — no public API change, no release.
