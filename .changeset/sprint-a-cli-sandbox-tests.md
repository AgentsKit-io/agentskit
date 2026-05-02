---
'@agentskit/cli': patch
'@agentskit/sandbox': patch
---

chore(audit): Sprint A — cli + sandbox threshold raises.

Raises both packages from `linesThreshold: 30` to `60` per the audit
gate.

**`@agentskit/cli`** — coverage 53.98% → 63.00%. New tests:

- `tests/shared.test.ts` covers `mergeWithConfig` (config defaults,
  apiKeyEnv resolution, explicit-flag wins).
- `tests/providers.test.ts` covers `resolveChatProvider` (demo +
  every keyed provider, env-key fallback, missing-key + missing-model
  errors, case-insensitive name).
- `tests/resolve.test.ts` covers `resolveTools` / `resolveSkill` /
  `resolveSkills` / `resolveMemory` / `getBuiltinToolNames`.
- `tests/embedders.test.ts` covers `createOpenAiEmbedder` (success,
  custom baseUrl + model, HTTP-error path, missing-data response).
- `tests/slash-commands.test.ts` covers `parseSlashCommand`,
  `createSlashRegistry`, and every builtin command's success +
  warn / error branches.

**`@agentskit/sandbox`** — coverage 57.14% → 91.83%. New
`tests/e2b-backend.test.ts` mocks `@e2b/code-interpreter` and exercises
streaming stdout/stderr, default language, sandbox reuse across calls,
dispose lifecycle, timeout path, and runtime-error capture.

No runtime behaviour change.
