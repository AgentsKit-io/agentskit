---
---

chore(docs): cross-link extra + vertical skills from `agents/skills/index`.

Adds inline links to every per-skill page (prReviewer, sqlAnalyst,
technicalWriter, securityAuditor, customerSupport) and a dedicated
"Vertical (regulated domains)" section listing healthcareAssistant,
clinicalNoteSummarizer, financialAdvisor, transactionTriage. Closes
G/P1 of the enterprise-readiness audit (#562).

Also adds `scripts/check-for-agents-coverage.mjs` — a CI helper that
asserts every value export in `packages/<name>/src/index.ts` is
mentioned in the corresponding `for-agents/<name>.mdx` page. Not yet
wired into ci.yml; lands in a follow-up once existing for-agents
drift PRs (#718, #721, #722, #723) merge to main.
