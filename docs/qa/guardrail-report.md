# Periodic guardrail report

The monthly **Periodic guardrail report** workflow runs on `main` and supports
manual dispatch on `main`. It adds the Markdown report to the workflow summary
and uploads Markdown and JSON as the `guardrail-report` artifact. It does not
write to the repository or create issues.

The report runs the existing JSDoc, public API snapshot, bundle-size,
NET-rules, cross-platform, coverage-floor, and CI-timing checks. It consumes
their JSON output; the JSDoc, public API snapshot, and coverage-floor checks
also support `--json` for this use. Build packages first because the API,
JSDoc, portability, and size checks read built outputs.

```bash
pnpm install --frozen-lockfile
pnpm --filter "./packages/*" build
node scripts/guardrail-report.mjs --output-dir /tmp/agentskit-guardrail-report
```

The script writes `report.md` and `report.json` in the output directory. To
compare a report with the prior JSON artifact, pass its path with
`--previous PATH`. Numeric metrics that exist in both reports receive a delta;
the first run has no prior report. CI timing uses the existing `pnpm ci:timing
--format json` command and therefore requires GitHub CLI access locally.

Bundle measurements and configured limits are gzip bytes from `.size-limit.json`.
The NET and cross-platform totals count the findings recorded in their committed
ratchet baselines; the checks separately report regressions and improvements.
Coverage floors are configured Vitest line thresholds by package, not measured
test coverage. The CI timing sample summarizes the latest 30 completed main and
pull-request runs.
