---
"@agentskit/sandbox": minor
---

Add a zero-dependency, zero-vendor browser code-execution backend at the new
subpath `@agentskit/sandbox/web`. `webWorkerBackend()` conforms to the existing
`SandboxBackend` contract and runs JavaScript inside a Web Worker created from a
Blob URL — pure web-platform APIs, no npm deps and no external service. It
captures `console.*` into stdout/stderr, turns uncaught errors into
`exitCode: 1`, honors `options.timeout`, and throws a clear `SandboxError` in
non-browser environments.

Wire it via `createSandbox({ backend: webWorkerBackend() })` or pass it to
`sandboxTool`. An additive `runStreaming(code, onChunk, options?)` helper is
also exported for live stdout/stderr streaming. The server entry point is
unchanged and remains free of browser-only code.
