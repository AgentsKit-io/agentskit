---
title: CLI adapter protocol boundary and agentic prompt serialization
name: reference_cli-adapter-protocol-boundary
description: exec-text manifests only yield text; claude-code-json is the structured path; agentic manifests must not send raw AdapterRequest JSON to stdin
metadata:
  type: reference
---

**Fact:** In `@agentskit/adapters/cli`, the protocol bounds the output.
`exec-text` (`codex`, `claude-code`) yields streamed `text` only; `exec-json`
(`claude-code-json`, `claude -p --output-format json`) yields one parsed
response with `text`/`reasoning`/`tool_call`/`usage`; `acp` streams text and
reasoning and rejects tool calls. `unsupportedByProtocol` in
`src/cli/manifests.ts` enforces it at validation time.

**Why:** Live testing (2026-09) showed consumers discovering the boundary
only by reading source, and hand-rolling `buildArgs`/`parseOutput`/`parse`
to get tool calls out of Claude Code. Also, the generic default of writing
the raw `AdapterRequest` JSON to stdin made Claude Code refuse the request as
a prompt-injection attempt (`systemPrompt` in a JSON blob).

**How to apply:** Manifests for agentic CLIs must not send raw JSON. For
Claude Code, labelled `[system]`/`[tools]` blocks in the user prompt are
*also* flagged as injection (verified live, Claude Code 2.1.273); the system
prompt and tool contract must go through `--append-system-prompt`
(`claudeCodeRequestArgs` + `serializeCliMessages`, `src/cli/prompt.ts`), which
makes tool calls work. `serializeCliPrompt` (labelled blocks) remains for
CLIs without a system-prompt flag (codex). Keep the generic factory default
(raw JSON) for purpose-built CLIs. Claude Code envelope parsing lives in
`src/cli/claude-code.ts`; a `{ text?, toolCalls }` object embedded in
`result` (fenced or bare) becomes `tool_call` chunks. Document any new
manifest's protocol in the README table.
