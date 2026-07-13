# AgentsKit README Standard v1

Status: **approved**

Owner approval: [AgentsKit #1203](https://github.com/AgentsKit-io/agentskit/issues/1203#issuecomment-4963143065)

Machine contract: [`readme-standard-v1.json`](../readme-standard-v1.json)

README Standard v1 makes public repository and package documentation testable without flattening every product into one cosmetic template. Product facts stay in their canonical manifests, claims ledgers, package metadata, fixtures, and human docs; the README explains the correct journey and links to that evidence.

## Profiles

| Profile | Use it for | Badge budget | Image budget | Review cadence |
|---|---|---:|---:|---:|
| `top-level-repository` | Parent or product repositories | ≤ 12 | 1–6 | 90 days |
| `public-app` | Runnable public apps and documentation properties | ≤ 8 | 1–5 | 90 days |
| `major-package` | Primary packages with an independent adoption journey | ≤ 8 | 1–4 | 120 days |
| `concise-package` | Focused packages whose package guide carries depth | ≤ 6 | 0–2 | 180 days |

Applicability is declared per surface. A gate must never infer that a package is “major” from README length or popularity.

## Required dimensions

Every profile requires evidence for:

1. the product promise and intended user;
2. proof linked to canonical evidence;
3. copy-ready commands and executable examples;
4. a useful visual explanation, or an approved explanation when an image adds no understanding;
5. maturity and stability;
6. compatibility;
7. contribution and license paths;
8. metadata and discovery tags;
9. contextual relationships to the relevant AgentsKit ecosystem products.

The wording and order are product-specific. The evidence is not.

## Quality budgets

- **Badges:** profile maximums prevent a README header from becoming an unscannable status dashboard.
- **Images:** every local image must resolve and be declared. Zero images require an approved `visual-exception`, including for concise packages.
- **Accessibility:** missing or empty image alt text is never allowed.
- **Dark mode:** every declared visual must be neutral/dark-safe or provide existing paired light and dark files.
- **Commands:** every marked primary command must match a declaration with a committed test path and CI command. Unverified primary commands are never allowed.
- **Examples:** every marked primary code sample is byte-synchronized with its executable fixture.
- **Freshness:** canonical sources are content-hashed, so drift fails immediately. A human review also expires at the profile cadence.

## Exceptions

An exception may preserve a deliberate deviation, but it cannot pretend the rule passed. It must declare:

- `ruleId` and affected surface;
- a concrete reason;
- `approvedBy`;
- an HTTPS tracking URL;
- `reviewOn`, after which the exception stops applying.

Reports display the status as `excepted`. Expired or incomplete exceptions fail.

## Commands

```bash
pnpm check:readme-standard
pnpm check:readme-standard -- --json
pnpm test:readme-standard
```

Fixture and downstream runners may select an explicit repository, config, and audit date with `--root`, `--config`, and `--date`. Production CI uses the current UTC date; tests pin the date so output snapshots remain reproducible.

After reviewing a legitimate change to a README or one of its canonical sources:

```bash
pnpm readme:standard:refresh
```

Do not refresh only to silence drift. Review the rendered README, rerun its declared examples, and verify the facts first.

## Rollout contract

The root AgentsKit README is the proof surface. Apps, packages, and sibling repositories adopt the standard through independent tickets and pull requests so each change follows its repository rules and retains accurate product-specific knowledge.
