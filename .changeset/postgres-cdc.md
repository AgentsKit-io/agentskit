---
"@agentskit/tools": minor
---

Add Postgres CDC primitives (`postgresCdc`, `postgresCdcStatus`, `postgresCdcCreateSlot`, `postgresCdcDropSlot`, `postgresCdcAdvance`, `postgresCdcPeek`, `createCdcStream`) under `@agentskit/tools/integrations`.

- Slot-management tools run via an injected `CdcAdminClient` (any parameterised SQL runner — `pg`, Neon, Supabase). Heavy drivers (`pg-logical-replication`, `@supabase/realtime-js`) are not bundled. Slot names are validated with a strict identifier regex before reaching SQL.
- `postgres_cdc_create_slot`, `postgres_cdc_drop_slot`, and `postgres_cdc_advance` set `requiresConfirmation: true`. "Already exists" / "does not exist" surface as result flags rather than errors so agents can stay idempotent.
- `postgres_cdc_peek` uses `pg_logical_slot_peek_changes` (non-advancing) with a per-call `maxPeek` cap and truncation flag.
- Continuous AsyncIterable streaming is exposed as `createCdcStream(config, { signal, startLsn })` — designed for the `@agentskit/triggers` T-9 CDC trigger, not for tool-execute semantics.
- Closes #728. Downstream tracking AgentsKit-io/agentskit-os#167.
