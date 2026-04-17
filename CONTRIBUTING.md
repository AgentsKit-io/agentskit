# Contributing to AgentsKit.js

Thanks for being here. This guide gets you from `git clone` to merged PR with the least friction we know how to provide.

> **Read first**: [`MANIFESTO.md`](./MANIFESTO.md). Every change is measured against the ten principles in there. If you're proposing something that conflicts with a principle, that's an [RFC](./rfcs/), not a PR.

---

## Where to ask what

| Kind of thing | Best place |
|---|---|
| Bug — reproducible | [Bug Report issue](https://github.com/EmersonBraun/agentskit/issues/new?template=bug.yml) |
| Feature you want | [Feature Request issue](https://github.com/EmersonBraun/agentskit/issues/new?template=feature.yml) |
| Docs problem | [Documentation issue](https://github.com/EmersonBraun/agentskit/issues/new?template=docs.yml) |
| Non-trivial design proposal | [RFC issue](https://github.com/EmersonBraun/agentskit/issues/new?template=rfc.yml), then a PR in `/rfcs/` |
| General question / "how do I" | [GitHub Discussions](https://github.com/EmersonBraun/agentskit/discussions) |
| Security disclosure | [`SECURITY.md`](./SECURITY.md) — private channel |

---

## Setup in 5 minutes

### Prerequisites

- **Node.js 22+** (LTS recommended; Node 25 known-broken on the legacy Docusaurus app — use `apps/docs-next` instead)
- **pnpm 10+** (`npm install -g pnpm` if missing)
- **git** with a global identity configured

### Clone and install

```bash
git clone https://github.com/EmersonBraun/agentskit.git
cd agentskit
pnpm install
```

That's it. The whole monorepo is now linked.

### Verify everything works

```bash
pnpm build       # build all packages — under 10s with cache
pnpm test        # run all tests — under 30s
pnpm lint        # tsc --noEmit across packages
```

### Run the docs site locally

```bash
pnpm docs                          # opens http://localhost:3000
# or, from inside apps/docs-next:
pnpm dev
```

The legacy Docusaurus site is still available during the migration:

```bash
pnpm docs:legacy
```

---

## Repo layout

```
agentskit/
  packages/         — published packages (@agentskit/core, /react, /ink, …)
  apps/             — example apps + docs sites (not published)
  docs/architecture/adrs/   — formal contract decisions
  rfcs/             — design proposals under discussion
  tests/            — cross-package E2E (Playwright)
  .changeset/       — pending version bumps
  .github/          — workflows, issue templates, CODEOWNERS
```

Every package has a focused **`CONVENTIONS.md`** at its root explaining what belongs there, what doesn't, and how to add a new thing. Read it before opening a PR that touches that package.

---

## Making a change

### 1. Pick or open an issue

Don't surprise reviewers. Either:

- Pick an [open issue](https://github.com/EmersonBraun/agentskit/issues) (look for [`good first issue`](https://github.com/EmersonBraun/agentskit/labels/good%20first%20issue) or [`help wanted`](https://github.com/EmersonBraun/agentskit/labels/help%20wanted)), comment that you're taking it.
- Or open a new issue describing what you want to do **before** writing code, especially if the change touches a contract or a public API.

### 2. Branch and write code

```bash
git checkout main && git pull
git checkout -b your-name/short-description
```

Branch naming is informal but `area/short-slug` (e.g. `adapters/add-mistral`, `docs/typos-in-recipes`) helps scanning.

### 3. Write tests first when possible

Each package has a `vitest.config.ts` with a per-package coverage threshold. CI blocks merges that drop below the threshold (see [`docs/STABILITY.md`](./docs/STABILITY.md) and the `coverage` workflow). A new feature without a test will not pass review.

```bash
pnpm --filter @agentskit/core test            # run one package's tests
pnpm --filter @agentskit/core test:coverage   # with coverage report
```

### 4. Type-check and bundle-check

```bash
pnpm --filter @agentskit/core lint            # tsc --noEmit
pnpm size                                      # all packages, gzipped
```

`@agentskit/core` is capped at **10KB gzipped** by [Manifesto principle 1](./MANIFESTO.md). The `size` workflow blocks PRs that exceed any package's budget.

### 5. Add a changeset (any user-facing change)

```bash
pnpm changeset
```

This walks you through which packages are affected and what kind of bump (patch / minor / major). The resulting `.changeset/*.md` file is part of your PR. The release workflow consumes it later.

A change is **user-facing** if it adds or modifies a public export, changes runtime behavior, or affects the docs surface a consumer reads.

### 6. Open a PR

Use the PR template — it auto-fills with the checklist we expect:

- [ ] Tests added or updated
- [ ] Types check
- [ ] Bundle size within budget
- [ ] Changeset created
- [ ] Docs updated
- [ ] Manifesto principles respected
- [ ] Screenshots or demo for UI changes

Title: `<type>(<scope>): <imperative one-liner>`. Examples:

- `feat(adapters): add Mistral provider`
- `fix(core): handle empty message arrays in controller`
- `docs(recipes): clarify cost guard recipe`
- `test(e2e): cover keyboard shortcuts in example-react`

### 7. Reviews and CODEOWNERS

Each package has owners listed in [`.github/CODEOWNERS`](./.github/CODEOWNERS). They're auto-requested for review. Most PRs need one approval from an owner. Contract changes (anything in `docs/architecture/adrs/`) need two.

### 8. Merge

Maintainers merge with **squash-and-merge** by default, keeping the PR title as the squash commit message. Your branch is deleted automatically.

---

## What requires an RFC vs a PR

Open an [RFC](./rfcs/) before code if any of these are true:

- A new package is being introduced
- A breaking change to one of the six core contracts (Adapter, Tool, Memory, Retriever, Skill, Runtime)
- A long-term tooling decision (build pipeline, theme system, deploy target)
- A trade-off the reviewers will spend an hour debating

Open a **PR directly** for:

- Bug fixes
- New tools, skills, adapters, memory backends (governed by per-package `CONVENTIONS.md`)
- Documentation (typos to whole pages)
- Internal refactors that keep public APIs stable
- Test additions

If you're unsure, open an issue first and ask.

---

## Code style

The short version (full rules in [`CLAUDE.md`](./CLAUDE.md) and per-package `CONVENTIONS.md`):

- **TypeScript strict everywhere.** No `any` — use `unknown` and narrow.
- **Named exports only.** No default exports.
- **Tree-shakeable by default.** Prefer multiple small exports over one big object.
- **No barrel files in publishable packages** beyond the top-level `src/index.ts`.
- **Components are headless.** Use `data-ak-*` attributes for styling hooks; don't hardcode colors.
- **Tools name with snake_case** (matches every major provider). Match the regex `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$`.

---

## Tests

- **Unit tests**: `vitest`, run with `pnpm test`.
- **Coverage gate**: per-package thresholds in each `vitest.config.ts`.
- **E2E**: Playwright, run with `pnpm test:e2e`. Covers the four example apps.
- **Bundle size**: `size-limit`, run with `pnpm size`.

CI runs all of these on every PR. Run them locally first to avoid burning CI minutes.

---

## Documentation

If your change affects what a consumer sees or does:

- Update the relevant page in `apps/docs-next/content/docs/`
- Add a recipe if you've added a new building block (`apps/docs-next/content/docs/recipes/`)
- Update the relevant ADR if you've changed how a contract behaves (rare — usually a new ADR superseding the old one)
- Update the package's `README.md` if its public surface changed

---

## Releases

Maintainers tag releases with the [Changesets Action](https://github.com/changesets/action). Your changeset gets consumed automatically.

For local experimentation: `pnpm changeset version` then `pnpm changeset publish`. Don't run the publish command unless you're a maintainer with npm access.

---

## Who maintains what

See [`.github/CODEOWNERS`](./.github/CODEOWNERS) for the per-package owner map.

---

## Code of Conduct

We follow the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be kind. Be specific. Disagree about ideas, not about people.

---

## Recognition

Contributors land in the contributors page on the docs site (coming soon). Significant ongoing contributors may be invited to the `CODEOWNERS` of a package.

---

## Stuck?

- Open a [Discussion](https://github.com/EmersonBraun/agentskit/discussions) — somebody usually responds within a day
- Check [`CLAUDE.md`](./CLAUDE.md) for project-specific patterns
- Read the [Manifesto](./MANIFESTO.md) when something feels wrong — it usually answers "why is it this way?"
