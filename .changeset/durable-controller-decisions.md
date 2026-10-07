---
"@agentskit/core": minor
"@agentskit/svelte": minor
---

Add durable `controller.decide` with an injectable atomic decision store, persisted confirmation snapshots, terminal replay, and tool-result continuation across controllers. Preserve and deprecate generation-local `approve`/`deny`. Accept `ContentPart[]` in controller `send` alongside legacy strings.

`ChatController.decide` is now a required interface member, and `ChatController.send` and shared `ChatReturn.send` accept `string | ContentPart[]`. Custom `ChatController` implementations must add `decide`; implementations of either interface must widen `send`. Existing string callers continue to work. The Svelte chat store exposes `decide` with the same lifecycle guards as its other asynchronous actions.

Durable decisions preserve unsaved live turns, validate the pending conversation before claiming, and reconcile sibling outcomes without mutating subscriber snapshots.
