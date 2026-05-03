# @agentskit/visual-react

Visual regression harness for `@agentskit/react` components — issue [#253](https://github.com/AgentsKit-io/agentskit/issues/253).

## What this is

A small Vite app that renders each public component in a deterministic state, plus a Playwright suite that snapshots every state to PNG and compares against a committed baseline.

The harness lives outside the standard `pnpm test` pipeline because it requires a Chromium browser binary (~150 MB). Run it explicitly when changing components or theme CSS.

## One-time setup

```bash
pnpm --filter @agentskit/visual-react test:visual:install
```

This runs `playwright install --with-deps chromium`.

## Generate / update baselines

```bash
pnpm --filter @agentskit/visual-react test:visual:update
```

Commit the resulting `tests/visual.spec.ts-snapshots/*.png` files. Review every changed image before pushing — the suite is the source of truth for what the components look like.

## Verify against baselines

```bash
pnpm --filter @agentskit/visual-react test:visual
```

Fails if any case drifts outside `maxDiffPixelRatio: 0.001`. On failure, Playwright writes `*-actual.png` and `*-diff.png` next to the baseline.

## Browse cases manually

```bash
pnpm --filter @agentskit/visual-react dev
```

Open http://127.0.0.1:4178 for the index, or jump straight to a case via `?case=<id>`. Add a new case in `src/Harness.tsx` — its id will automatically appear in `CASE_IDS` and the spec will pick it up.

## Determinism rules

- All `Date` values use a frozen `2026-01-01T00:00:00.000Z`.
- Animations, transitions, and caret colour are stripped via injected CSS at test time.
- Viewport, locale, timezone, colour scheme, and device scale are pinned in `playwright.config.ts`.
- Tests run on the chromium project only — keep baselines small and avoid OS-dependent rendering.

If a snapshot drifts without a real visual change, look for a missed source of non-determinism (font fallback, server-side date, Math.random) before regenerating the baseline.

## CI

Not wired into the default workflow yet. To enable, run:

```yaml
- run: pnpm --filter @agentskit/visual-react test:visual:install
- run: pnpm --filter @agentskit/visual-react build
- run: pnpm --filter @agentskit/visual-react test:visual
```

Cache the Playwright browser bundle at `~/.cache/ms-playwright`.
