# Interop fixtures

Portable, synthetic round-trip fixtures in `fixtures/*.json`, exercised by
`fixtures.test.ts` (`pnpm test:interop`). Each file has `schemaVersion: 1`,
`kind`, `canonicalSha256`, `valid[]` and `invalid[]`.

| File | Covers |
| --- | --- |
| `messages.json` | text messages and multimodal content parts |
| `tools.json` | tool call, tool result, error result |
| `memory.json` | ChatMemory message records |
| `vector-documents.json` | `VectorDocument` records |
| `stream.json` | `StreamChunk`: text, tool call, done, error |
| `errors.json` | typed core errors and abort/cancellation |
| `eval.json` | an eval result record |

## What each fixture proves

- `valid[]` cases pass the public core validators and keep the same canonical
  hash across `JSON.stringify` / `JSON.parse`.
- `invalid[]` cases are rejected by those validators.
- `canonicalSha256` pins the whole valid set, so any drift is detected.

## How an external bridge uses them

1. Load each file and check `schemaVersion === 1`.
2. Map each `valid[].value` to the bridge's own types.
3. Serialize it back and compare `sha256Hex(canonicalJson(value))` with the
   pinned hash (canonical JSON: sorted keys, see `@agentskit/core/hash`).
4. Reject every `invalid[]` case.
