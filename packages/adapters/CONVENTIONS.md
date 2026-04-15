# Conventions — `@agentskit/adapters`

The provider layer. Every file in this package maps one LLM or one embedding provider to AgentsKit's stable contracts.

## Scope

- **Chat adapters** — implement `AdapterFactory` per [ADR 0001](../../docs/architecture/adrs/0001-adapter-contract.md)
- **Embedders** — implement `EmbedFn` per [ADR 0003](../../docs/architecture/adrs/0003-memory-contract.md)
- **No UI.** No React, no Ink, no CLI here.
- **No runtime logic.** No loops, no tool execution. Just transport.

## Adding a new chat adapter

1. Create `src/<provider>.ts`. Export a factory function that returns `AdapterFactory`.
2. Accept configuration at construction time only: `apiKey`, `model`, `baseUrl` as needed.
3. In `createSource`, build the request but **do not fetch yet**. Defer all I/O to `stream()` — invariant A1.
4. In `stream()`, use the SSE utility from `src/utils.ts` if the provider speaks server-sent events. Otherwise write a parser that respects the chunk shape in `@agentskit/core`.
5. Always end with `{ type: 'done' }`, an error chunk, or iterator return on abort — invariant A3.
6. Yield `{ type: 'text', content }` for text deltas. Yield `{ type: 'tool_call', toolCall: { id, name, args } }` with **complete args** per invariant A5.
7. Put provider-specific data in `chunk.metadata` (usage counts, raw response, reasoning). Consumers must not depend on its shape — A8.
8. Re-export from `src/index.ts`.

## Adding a new embedder

1. Create `src/embedders/<provider>.ts`. Export a factory returning `EmbedFn`.
2. Accept `apiKey`, `model` at construction.
3. Return a function of `(text: string) => Promise<number[]>`.
4. Must be stable: same input + same model = same vector. No randomness — invariant E1.
5. Re-export from `src/embedders/index.ts` and from `src/index.ts`.

## Naming

- File name matches the provider: `openai.ts`, `anthropic.ts`, `gemini.ts`, etc.
- Factory function matches the provider lowercase: `openai(opts)`, `anthropic(opts)`.
- Options interface: `OpenAIAdapterOptions`, `AnthropicAdapterOptions`.
- Types internal to one adapter live in the same file; shared types go in `src/types.ts`.

## Testing

For every new adapter:

- **Contract test** using the shared `AdapterContractSuite` (when it lands — for now, at minimum run the ten invariants mentally against your implementation)
- **Stream parsing test** with a recorded fixture (JSON file of SSE chunks) so tests are fast and deterministic
- **Error path test** — what happens on 401, 429, 500, malformed response
- **Abort test** — `stream()` iteration terminates when `abort()` is called mid-flight

Tests live in `tests/<provider>.test.ts`.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Calling `fetch` from `createSource` | Defer to `stream()` |
| Mutating the input `messages` array | Copy if you need to transform for the wire format |
| Throwing from `stream()` on a provider error | Emit `{ type: 'error', metadata: { error } }` |
| Streaming partial tool-call args across multiple chunks | v1 requires complete args in one chunk. Buffer internally. |
| Exposing provider SDK types in your public API | Keep the public surface limited to `AdapterFactory` |

## Review checklist for this package

- [ ] Implements all ten invariants A1–A10
- [ ] Bundle size under 20KB gzipped (tightens over time)
- [ ] Coverage threshold holds (60% lines; aiming for 80%)
- [ ] Contract-tested against the ten invariants
- [ ] SSE parsing uses `src/utils.ts` helpers where possible
- [ ] README updated if the public export surface changed
