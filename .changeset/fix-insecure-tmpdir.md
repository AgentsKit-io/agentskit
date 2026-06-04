---
"@agentskit/tools": patch
---

Security: `listTools()` no longer instantiates the filesystem tool with a shared OS temp directory (`os.tmpdir()`) as its base path, which a code-scanning alert flagged as an insecure temporary file location. It now uses `process.cwd()`. `listTools` only reads tool metadata, so this does not change tool execution behaviour.
