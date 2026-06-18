---
"@agentskit/integrations": minor
"@agentskit/tools": minor
---

Add two GitHub pull-request review actions: `github_create_pr_review_comment` (a single line-level review comment, anchored to a commit + path + line) and `github_create_pr_review` (a batched review — APPROVE / REQUEST_CHANGES / COMMENT verdict, optional summary body, and any number of inline comments in one call). Both flow through the existing `github({ token })` tool factory automatically. Fills the gap where the GitHub integration could comment on issues but not post line-level PR review comments.
