---
'@agentskit/observability': minor
---

Add replay primitives: `replayEvents` (drive sinks over historical events),
`replayBisect` (O(log n) regression localisation over a change history), and
`buildTimeline` / `diffState` / `positionAt` (scrubber timeline with cumulative
cost/token/latency and per-checkpoint state diffs). All additive — no existing
export changed.
