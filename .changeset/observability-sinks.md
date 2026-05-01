---
'@agentskit/observability': minor
---

feat(observability): three SaaS sinks built on the trace tracker:

- `datadogSink` (#475) — Datadog Logs HTTP intake. Configurable `site` (datadoghq.com / datadoghq.eu / us5...), `service`, `env` tag.
- `axiomSink` (#476) — Axiom dataset ingest with Bearer token. Configurable `endpoint` for EU region.
- `newRelicSink` (#477) — New Relic Logs API. Region-aware (`US` default, `EU` flag).

All three swallow network errors so observability never breaks the main loop. Each emits one event per span start and one per span end with `service`, `phase`, span ids, timestamps, status, and the full attribute bag.
