# Conformance suites

One suite per core contract. Each names its tests by invariant id, so a failure maps straight back to the ADR.

| Contract | ADR | Suite | Command |
|---|---|---|---|
| Adapter | [0001](./adrs/0001-adapter-contract.md) | `packages/adapters/tests/contract.ts` (A1–A10) | `pnpm --filter @agentskit/adapters test` |
| Tool | [0002](./adrs/0002-tool-contract.md) | `packages/tools/tests/contract.ts` (T1–T12) | `pnpm --filter @agentskit/tools test` |
| Memory | [0003](./adrs/0003-memory-contract.md) | no named suite yet; the shared fixture `tests/interop/fixtures/memory.json` plus `packages/memory/tests/` | `pnpm --filter @agentskit/memory test` |
| Retriever | [0004](./adrs/0004-retriever-contract.md) | no named suite yet; fixture `tests/interop/fixtures/vector-documents.json` | `pnpm --filter @agentskit/rag test` |
| Skill | [0005](./adrs/0005-skill-contract.md) | `packages/skills/tests/adr-0005-contract.test.ts` | `pnpm --filter @agentskit/skills test` |
| Runtime | [0006](./adrs/0006-runtime-contract.md) | `packages/runtime/tests/contract.ts` (RT1–RT14) | `pnpm --filter @agentskit/runtime test` |

Memory and Retriever are the two contracts that still lack an invariant-by-id harness.

## Shared fixtures

The Tool and Runtime suites read the portable fixtures in `tests/interop/fixtures/` (`tools.json`, `stream.json`, `errors.json`). See `tests/interop/README.md`. Run the fixtures themselves with `pnpm test:interop`.

## Running the suite for your family from an external bridge

1. Copy the harness file (`contract.ts`) of your family, or import it from a checkout of this repository.
2. Describe your implementation as a case. For Tool, a case lists a `build()` that returns your `ToolDefinition[]`, plus `validArgs` and `invalidArgs` per tool name. For Runtime, pass your factory to `runRuntimeContract(label, createRuntime)`. The factory receives a `RuntimeConfig` whose adapter is a scripted mock.
3. Call the runner from a Vitest file (`runToolContract([...])`, `runToolLifecycleContract(...)`, `runRuntimeContract(...)`).
4. Every invariant appears as a test named `T<n>` or `RT<n>`. A failure names the ADR rule that your implementation breaks.

## Known violations

- **T6 (Tool streaming).** Core joins every value yielded by an `AsyncIterable` tool into the result, where ADR 0002 says only the last yielded value is the result. Fixing it changes the output of existing streaming tools, so it is an `it.todo` in `packages/tools/tests/contract.ts` and not a patch.
