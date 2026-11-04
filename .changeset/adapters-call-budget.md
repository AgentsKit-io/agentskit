---
'@agentskit/adapters': minor
---

Add `withBudget` and `createBudgetLedger`: a per-call USD ceiling and named (per-customer or per-user) budgets that refuse the call with a typed `BudgetExceededError` (`AK_BUDGET_EXCEEDED`) before the model is called.
