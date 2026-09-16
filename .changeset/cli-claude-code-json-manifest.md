---
'@agentskit/adapters': minor
---

CLI adapters: add the `claude-code-json` manifest (`claude -p --output-format json`, `exec-json`) with a built-in envelope parser that emits `text`, `tool_call`, and `usage` chunks, so structured output from Claude Code no longer needs hand-written `buildArgs`/`parseOutput`/`parse`. Agentic manifests (`codex`, `claude-code`, `claude-code-json`) now serialize the request as labelled `[system]`/`[user]` prompt blocks via the exported `serializeCliPrompt` instead of raw `AdapterRequest` JSON, which Claude Code rejected as a prompt-injection attempt. Manifests may declare `serializeRequest`, `parseOutput`, and `parse`, and `resolveCliManifest` forwards them. Documented the `exec-text` vs `exec-json` capability boundary.
