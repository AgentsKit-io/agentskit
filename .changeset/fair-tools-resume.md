---
"@agentskit/core": patch
---

Register streamed confirmations on arrival, treat identical in-flight decisions as no-ops, and preserve active streams when a decision is rejected. Resume only the latest completed assistant turn after every confirmation is decided, with results immediately following their originating assistant in call order.

Restarting streamed decisions requires current ChatMemory because immutable arrival snapshots may omit subsequent calls. Without current conversation memory, an incomplete streamed snapshot raises AK_CONFIG_INVALID before claiming or executing.
