---
'@agentskit/observability': patch
'@agentskit/observability-langfuse': patch
---

Harden observability redaction, cost controls, tracing, and Langfuse boundaries.

The observability ESM bundle budget is now 16.5 kB gzip to account for these
runtime safety checks while retaining a finite size gate.
