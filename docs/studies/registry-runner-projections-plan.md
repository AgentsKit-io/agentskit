# Registry runner projections and interoperability rollout

> Status: In progress. Date: 2026-08-20. Related: [#1477](https://github.com/AgentsKit-io/agentskit/issues/1477), [Registry #132](https://github.com/AgentsKit-io/agentskit-registry/issues/132), [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198).

## Intent

Make every source-owned agent in the AgentsKit Registry usable from the major
coding-agent and agent-runner ecosystems without maintaining a separate agent
implementation for each host.

The Registry remains the source of truth. A runner-specific export is a thin
projection of the same manifest and entry point, not a fork and not a new
runtime lock-in.

## Current baseline

- `npx agentskit add <id>` copies an agent into the consumer project, where the
  consumer owns the source and can run it from Node, a serverless runtime, a
  terminal, or another host.
- `@agentskit/mcp` already provides the AgentsKit MCP boundary. MCP is the
  first transport to standardize because it can expose tools without coupling
  the Registry to a host vendor.
- The existing tool, skill, composition, ecosystem-manifest, execution-boundary,
  and MCP ADRs are the contract sources. This plan must reuse them rather than
  inventing a second agent format.

## Target delivery model

```text
Registry AgentSchema + source-owned entry point
                    |
       +------------+-------------+----------------+
       |                          |                |
   source install             MCP export       host projection
   (current)                  (first)           (skills/rules)
                                                    |
                                  Codex · Claude · Cursor · other hosts
```

Native plugins are optional projections only when a host publishes a stable,
public extension API. They are not prerequisites for MCP or source install.

## Host compatibility matrix

The matrix is evidence-driven. `planned` is not a support claim; it means the
projection still needs a public-format check and a clean-environment test.

| Host | MCP projection | Skills/rules projection | Native plugin | First evidence gate |
|---|---|---|---|---|
| Codex | planned | planned | planned | clean project + MCP/tool invocation |
| Claude | planned | planned | planned | clean project + MCP/tool invocation |
| Cursor | planned | planned | planned | clean project + MCP/tool invocation |
| DeepSeek Harness | planned | planned | planned | official MCP client, stdio/HTTP smoke test |
| Gemini-based runners | planned | planned | planned | identify public host contract, then smoke test |
| Kimi-based runners | planned | planned | planned | identify public host contract, then smoke test |
| Grok-based runners | planned | planned | planned | identify public host contract, then smoke test |
| Hermes and other hosts | planned | planned | planned | identify public host contract, then smoke test |

No host is marked supported until the generated artifact runs in a clean
environment and the result is recorded in the compatibility ledger.

### Current local host evidence (2026-08-20)

- Codex 0.148.0 accepted the pinned stdio server in an isolated `CODEX_HOME`;
  config discovery passed, invocation is still pending.
- Claude Code 2.1.237 wrote the project `.mcp.json` and listed the server as
  pending approval. A non-interactive invocation was attempted in an isolated
  project, but the CLI stopped before MCP startup because its OAuth session was
  expired (`loggedIn: false`); approval and invocation remain pending.
- Cursor 3.14.27 exposes `--add-mcp`; clean workspace invocation is still
  pending.
- Grok 1.0.5 wrote the project MCP config and detected the server, but its
  doctor correctly withheld startup for an untrusted project directory.
- DeepSeek, Gemini, Kimi, and Hermes CLIs are not installed in this workspace;
  no support claim is made for them.

## Phased rollout

### Phase 0 — Freeze the projection vocabulary

Reuse the existing Registry `AgentSchema`/manifest and add only projection
metadata that cannot be derived from current fields:

- stable `id`, exact `version`, license, entry point, and provenance;
- input and output JSON Schemas;
- projection mode (`skill` or `typed`); typed projections require an explicit
  output schema and cannot be flattened into a generic text tool;
- capabilities and required tools;
- network, secret, and side-effect declarations;
- human-approval requirement;
- supported projection targets and their minimum versions;
- evaluation/conformance evidence.

Deliverable: one manifest example, a compatibility-state vocabulary
(`verified`, `partial`, `planned`, `unsupported`), and a fail-closed typed
projection guardrail.

### Phase 1 — Registry-to-MCP vertical slice

Start with the read-mostly `research` agent (a single skill with default
fetch/search tools and no caller-injected command runner):

1. export the agent as a namespaced MCP tool;
2. map inputs and outputs to JSON Schema;
3. publish a pinned, reproducible runner configuration;
4. add a conformance test for discovery, invocation, errors, timeout, and
   approval behavior;
5. run it against the DeepSeek Harness MCP client and one additional MCP host.

Multi-stage agents such as `code-review` are a later projection target: their
factories require source-specific inputs and cannot be represented honestly by
the generic single-skill MCP wrapper.

The same boundary applies to typed agents that rely on `invokeStructured`,
Zod output schemas, or agent-specific safety nets. Their MCP discovery can be
smoked, but they stay unprojected until a typed-agent contract preserves those
semantics; a generic `task -> text` wrapper is not sufficient.

The MCP bridge now has a typed projection path that validates the outer input,
invokes the internal result tool, and validates the structured output. It also
rejects typed Registry metadata in the generic skill path. The first candidate
(`research-academic-synthesizer`) remains `planned` until this path is published
and its host-level invocation evidence is captured. Publish the MCP bridge
before making the typed Registry manifest live so older clients cannot flatten
the projection.

The generated configuration must pin an exact package version and integrity
hash. It must never install `latest` or auto-run newly published code after a
consumer has approved a configuration.

The published smoke test uses `@agentskit/mcp@0.4.3` with the Registry
`research` agent and exposes `fetch_url` and `web_search` over stdio. The
typed `research-academic-synthesizer` projection is `partial` until
host-specific approval and invocation behavior is verified.

### Phase 2 — Codex, Claude, and Cursor projections

Generate the smallest host-native artifact each host needs:

- Codex/Claude: skill/instruction projection plus MCP configuration;
- Cursor: rules/skill projection plus MCP configuration;
- all projections retain a link to the Registry source and the exact version.

The first Registry README now contains copyable MCP previews for all three
hosts, pinned to the verified `@agentskit/mcp@0.4.3` tarball. These remain
`planned` until each host's approval and invocation path is tested in a clean
project. Codex accepted the command through a read-only config override and
Claude Code wrote the expected project `.mcp.json` in an isolated temporary
project; Cursor's installed CLI did not expose its documented workspace flag,
so no host status was upgraded from `planned`.

The same README now includes a DeepSeek Harness `cordis.yml` projection using
the official `@deepseek-ai/dsh-mcp-client` stdio contract and namespaced tool
identity; its clean Harness invocation remains planned.

The projection generator should fail closed when a host format is unknown. It
must not silently emit a file that looks valid but is ignored by the host.

### Phase 3 — Gemini, Kimi, Grok, Hermes

Treat these as compatibility work, not marketing claims:

1. verify each host's public plugin, skill, MCP, or CLI contract;
2. add a minimal adapter only if the contract is documented and stable;
3. run the same conformance suite;
4. mark unsupported features explicitly instead of flattening them away.

If a host supports MCP but has no native projection, MCP is the supported path;
there is no need to create a bespoke plugin.

### Phase 4 — Distribution and discovery

Each Registry agent page receives generated, copyable actions:

- Add to MCP;
- Add to Codex;
- Add to Claude;
- Add to Cursor;
- source install;
- compatibility and security evidence.

Each recipe links back to the Registry agent, AgentsKit docs, and the host
documentation. The public evidence ledger records the tested host/version and
the date of verification.

## Safety and trust requirements

- exact version and integrity pinning;
- no silent startup downloads or arbitrary code execution;
- explicit declarations for secrets, network access, tools, and side effects;
- read-only defaults and human approval for destructive operations;
- sandboxing where the host supports it;
- namespaced tool identifiers to prevent collisions;
- provenance, license, and evaluation evidence shown before installation;
- generated configs must preserve MCP stdout/JSON-RPC boundaries.

## Preserved backlog

These ideas are intentionally saved for later phases rather than being mixed
into the first vertical slice:

1. provider-swap recipes (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter,
   Groq, Ollama);
2. interchangeable memory/RAG recipes (Upstash, Redis, Qdrant, MongoDB,
   Supabase, Weaviate);
3. Doc Bridge recipes for Claude, Cursor, Codex, Cline, and Continue;
4. production recipes for Langfuse, OpenTelemetry, Braintrust, Firecrawl,
   E2B, Cloudflare, and Browserbase;
5. coexistence bridges for Vercel AI SDK, LangChain.js, CopilotKit/AG-UI,
   DeepSeek Harness, and other standards-based hosts;
6. Registry badges, cross-links, SEO landing pages, and publication mirrors;
7. native plugins only where a real public host API and sustained demand exist;
8. compatibility dashboards, runner badges, and automatically refreshed
   verification evidence.

## Acceptance gates

- one Registry agent installs from source and remains source-owned;
- the same agent exports to MCP with pinned, reproducible configuration;
- MCP discovery and invocation pass in two clean hosts;
- Codex, Claude, Cursor, DeepSeek, Gemini, Kimi, and Grok/Hermes states are
  individually labeled as verified, partial, planned, or unsupported;
- no projection claims support without an executable smoke test;
- every public recipe links to the canonical Registry agent and exact release;
- no new host-specific dependency enters `@agentskit/core`.

## References

- [Tool contract](../architecture/adrs/0002-tool-contract.md)
- [Skill contract](../architecture/adrs/0005-skill-contract.md)
- [Composition rules](../architecture/adrs/0009-composition-rules.md)
- [Ecosystem manifest and claims](../architecture/adrs/0021-ecosystem-manifest-and-claims.md)
- [Integration execution boundaries](../architecture/adrs/0026-integration-execution-boundaries.md)
- [MCP beta boundaries](../architecture/adrs/0028-mcp-beta-boundaries.md)
- [Interoperability initiative](https://github.com/AgentsKit-io/agentskit/issues/1477)
- [Registry implementation issue](https://github.com/AgentsKit-io/agentskit-registry/issues/132)
