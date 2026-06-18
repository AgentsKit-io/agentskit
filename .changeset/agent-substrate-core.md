---
"@agentskit/core": minor
---

Add reusable substrate for registry/AKOS agents: `fuzzyMatchList`/`jaroWinkler` (zero-dep Jaro-Winkler fuzzy matching for sanctions/KYC/dedup without an LLM), the canonical `Finding`/`Severity`/`SEVERITY_ORDER` types for agents that surface issues, and `fenceUntrustedContent`/`UNTRUSTED_CONTENT_DIRECTIVE` (in `@agentskit/core/security`) to wrap attacker-influenced input as data, not instructions — the mitigation companion to `createInjectionDetector`.
