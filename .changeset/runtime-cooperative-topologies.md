---
'@agentskit/runtime': minor
---

Add cooperative fan-out-then-select topologies: `createCompareHandler`,
`createVoteHandler`, `createDebateHandler`, `createAuctionHandler` (plus the
shared `settleWithConcurrency`, `resolveConcurrency`, `InMemoryScratchpadStore`,
and `DEFAULT_TOPOLOGY_CONCURRENCY`). These complement the existing supervisor /
swarm / blackboard topologies. Each handler is generic over the run context and
decoupled from any flow-graph schema — it takes a plain config object, an
injected `TopologyRunAgent`, and returns a `TopologyOutcome`. All additive; no
existing export changed.
