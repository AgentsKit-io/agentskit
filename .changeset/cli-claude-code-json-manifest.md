---
'@agentskit/adapters': minor
---

CLI adapters: add the `claude-code-json` manifest (`claude -p --output-format json`, `exec-json`) with a built-in envelope parser that emits `text`, `tool_call`, and `usage` chunks, so structured output from Claude Code no longer needs hand-written `buildArgs`/`parseOutput`/`parse`. Agentic manifests (`codex`, `claude-code`, `claude-code-json`) now serialize the request as labelled `[system]`/`[user]` prompt blocks via the exported `serializeCliPrompt` instead of raw `AdapterRequest` JSON, which Claude Code rejected as a prompt-injection attempt. Manifests may declare `serializeRequest`, `parseOutput`, and `parse`, and `resolveCliManifest` forwards them. Documented the `exec-text` vs `exec-json` capability boundary.

Type-level protocol boundary: `CliProviderManifest` is now a union discriminated by `protocol` (`CliProviderManifestFor<P>`), `capabilities` and `requiredCapabilities` are typed as `CliCapabilitiesFor<P>`, and `getCliProviderManifest` returns the protocol-specific type for built-in ids, so requesting `tools` or `structuredOutput` from an `exec-text` manifest is a compile-time error. Custom manifests that over-claimed capabilities will now fail to type-check (they already failed at runtime).

New `@agentskit/adapters/langchain-bridge` subpath: `adapterToLangChainModel(adapter)` / `AgentsKitChatModel` wrap any `AdapterFactory` as a LangChain `BaseChatModel` (`_generate`, `_streamResponseChunks`, `bindTools`, `profile`), translating bound tools to `context.tools` and `tool_call` chunks to `AIMessage.tool_calls`, so an adapter can replace `ChatAnthropic`/`ChatOpenAI` in `createAgent`, `AgentNode`, and chains, including with `wrapModelCall` middleware and `responseFormat`. `@langchain/core` is an optional peer dependency.
