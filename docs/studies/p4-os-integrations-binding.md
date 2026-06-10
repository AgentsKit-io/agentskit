# P4 — `@agentskit/os-integrations` binding (ready-to-apply)

> Status: **validated, not yet landed.** Built green (lint + DTS), 5/5 tests pass,
> and `check:layers` (ADR-0064) passes — verified in a local clone of
> `AgentsKit-io/agentskit-os`. It is **not committed** because this session's
> sandbox could not hold the large os-repo working tree stable long enough to
> commit + push (the checkout repeatedly dropped 2000+ tracked files +
> node_modules mid-run). Apply the files below in a stable checkout.

## What it is

P4 of the integrations unification: a new os package `@agentskit/os-integrations`
that **binds the published `@agentskit/integrations` catalog (now on npm @ 0.1.0)
into AgentsKit-OS contracts**. First adapter: `toAgentskitTools` — projects a
catalog descriptor into OS `AgentskitTool`s so `os-runtime-agentskit` can consume
the unified 50-service catalog instead of reimplementing each provider (the basis
for P5: deleting the duplicated `os-runtime-agentskit/src/tools/*`).

## Apply steps (in `agentskit-os`)

```bash
git checkout -b feat/os-integrations-binding
mkdir -p packages/os-integrations/src packages/os-integrations/tests
# create the files below
pnpm install
pnpm --filter @agentskit/os-integrations lint   # tsc --noEmit
pnpm --filter @agentskit/os-integrations build
pnpm --filter @agentskit/os-integrations test    # 5 pass
pnpm check:layers                                # ADR-0064 must pass
git add packages/os-integrations .changeset/os-integrations-binding.md
git commit -m "feat(os-integrations): bind @agentskit/integrations catalog into OS agent tools (P4)"
git push -u origin feat/os-integrations-binding
```

## Gotchas discovered (already accounted for in the files)

1. **ADR-0064 layers (`check:layers`)** — do NOT `import` `AgentskitTool` from
   `@agentskit/os-runtime-agentskit` (that's a binding layer; importing it from a
   domain package is a `domain-not-to-binding` violation). The contract is
   mirrored **structurally** in `to-agentskit-tools.ts` instead. The projected
   objects are structurally assignable to the runtime's `AgentskitTool[]` at the
   call site.
2. **ADR-0002 (`depend-on-agentskit`)** — upstream `@agentskit/*` packages must be
   **peerDependencies**, not regular `dependencies` (mirrors how
   `os-runtime-agentskit` peer-depends on `@agentskit/core`). `@agentskit/integrations`
   is therefore a peer + dev dep.
3. **`exactOptionalPropertyTypes: true`** (os tsconfig is stricter than lib) —
   never assign explicit `undefined` to an optional property. `sideEffect` and the
   `ProjectionConfig` fields are set conditionally.
4. **`@types/json-schema`** must be a devDep (the published `@agentskit/integrations`
   `.d.ts` references the `json-schema` module for `JSONSchema7`).

---

## `packages/os-integrations/package.json`

```json
{
  "name": "@agentskit/os-integrations",
  "version": "1.0.0-alpha.0",
  "description": "AgentsKit-OS binding for the @agentskit/integrations catalog — projects catalog descriptors into OS contracts (agent tools today; connectors/triggers/oauth next).",
  "keywords": ["agentskit", "agentskit-os", "integrations", "catalog", "binding"],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "tsc --noEmit",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "@agentskit/integrations": "^0.1.0"
  },
  "devDependencies": {
    "@agentskit/integrations": "^0.1.0",
    "@types/json-schema": "^7.0.15",
    "@types/node": "^25.9.1",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8"
  },
  "agentskitos": {
    "distribution": "internal",
    "stability": "alpha",
    "stabilityNote": "L2 binding — projects @agentskit/integrations descriptors into OS contracts."
  },
  "license": "MIT",
  "homepage": "https://github.com/AgentsKit-io/agentskit-os/tree/main/packages/os-integrations",
  "repository": { "type": "git", "url": "git+https://github.com/AgentsKit-io/agentskit-os.git", "directory": "packages/os-integrations" },
  "bugs": { "url": "https://github.com/AgentsKit-io/agentskit-os/issues" },
  "author": "AgentsKit Contributors",
  "private": true,
  "sideEffects": false
}
```

## `packages/os-integrations/tsup.config.ts`

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['@agentskit/integrations', '@agentskit/core'],
})
```

## `packages/os-integrations/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"],
  "exclude": ["tests", "dist"]
}
```

## `packages/os-integrations/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      exclude: ['**/index.ts'],
      thresholds: { lines: 90, functions: 80, branches: 70, statements: 90 },
    },
  },
})
```

## `packages/os-integrations/src/to-agentskit-tools.ts`

```ts
import {
  bindHttp,
  httpOptionsFor,
  type Integration,
  type ProjectionConfig,
} from '@agentskit/integrations'

/**
 * Structural mirror of the os-runtime-agentskit `AgentskitTool` contract.
 * Declared locally (not imported) so this projection stays in the domain layer
 * and does not depend on the runtime binding layer (ADR-0064). The projected
 * objects are structurally assignable to `AgentskitTool[]` at the call site.
 */
export type AgentskitToolReturn =
  | { readonly kind: 'ok'; readonly value: unknown }
  | { readonly kind: 'error'; readonly code: string; readonly message: string }

export interface AgentskitTool {
  readonly name: string
  readonly description?: string
  /** RFC-0026 JSON Schema (object) for the tool's arguments. */
  readonly parameters?: Record<string, unknown>
  /** Autonomy-gate side-effect class. */
  readonly sideEffect?: 'none' | 'read' | 'write' | 'destructive' | 'external'
  execute(args: Record<string, unknown>, ctx: unknown): Promise<AgentskitToolReturn>
}

export interface ToAgentskitToolsOptions {
  /** Lazy credential resolver (API key / OAuth access token). Read per call. */
  getToken?: () => string | undefined
  /** Service-specific config passed through to the action's `ctx.config`. */
  config?: unknown
  /** Per-instance base URL override (e.g. Jira/Salesforce/Azure endpoints). */
  baseUrl?: string
  /** Extra request headers (merged after auth). */
  headers?: Record<string, string>
  /** Swap in a fake fetch for tests. */
  fetchImpl?: typeof globalThis.fetch
  /** Restrict to a subset of the integration's actions by name. Omit for all. */
  only?: readonly string[]
}

const INTEGRATION_ERROR = 'AK_OS_INTEGRATION_FAILED'

/** Build a ProjectionConfig without assigning explicit `undefined`
 *  (the OS tsconfig uses `exactOptionalPropertyTypes`). */
function projectionFrom(options: ToAgentskitToolsOptions): ProjectionConfig {
  const projection: ProjectionConfig = {}
  const credential = options.getToken?.()
  if (credential !== undefined) projection.credential = credential
  if (options.config !== undefined) projection.config = options.config
  if (options.baseUrl !== undefined) projection.baseUrl = options.baseUrl
  if (options.headers !== undefined) projection.headers = options.headers
  if (options.fetchImpl !== undefined) projection.fetch = options.fetchImpl
  return projection
}

/**
 * Project an `@agentskit/integrations` descriptor into OS `AgentskitTool`s.
 * The binding that lets the OS runtime consume the unified catalog instead of
 * reimplementing each provider — one descriptor, projected into the OS
 * agent-tool contract (RFC-0026 `parameters` + the autonomy `sideEffect` gate).
 */
export function toAgentskitTools(
  integration: Integration,
  options: ToAgentskitToolsOptions = {},
): AgentskitTool[] {
  const actions = options.only
    ? integration.actions.filter((a) => options.only!.includes(a.name))
    : integration.actions

  return actions.map((action): AgentskitTool => {
    const execute = async (
      args: Record<string, unknown>,
    ): Promise<AgentskitToolReturn> => {
      const http = bindHttp(httpOptionsFor(integration, projectionFrom(options)))
      const ctx = {
        http,
        fetch: options.fetchImpl ?? globalThis.fetch,
        config: options.config,
      }
      try {
        const value = await action.execute(args, ctx)
        return { kind: 'ok', value }
      } catch (err) {
        return {
          kind: 'error',
          code: INTEGRATION_ERROR,
          message: err instanceof Error ? err.message : String(err),
        }
      }
    }
    const tool: AgentskitTool = {
      name: action.name,
      description: action.description,
      parameters: action.schema as Record<string, unknown>,
      execute,
    }
    return action.sideEffect !== undefined ? { ...tool, sideEffect: action.sideEffect } : tool
  })
}
```

## `packages/os-integrations/src/index.ts`

```ts
// @agentskit/os-integrations — bind the @agentskit/integrations catalog into
// AgentsKit-OS contracts. Today: agent tools (toAgentskitTools). Connectors,
// triggers, OAuth specs, and marketplace listings follow.
export { toAgentskitTools } from './to-agentskit-tools'
export type {
  ToAgentskitToolsOptions,
  AgentskitTool,
  AgentskitToolReturn,
} from './to-agentskit-tools'
```

## `packages/os-integrations/tests/to-agentskit-tools.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { slackIntegration, githubIntegration } from '@agentskit/integrations'
import { toAgentskitTools } from '../src/to-agentskit-tools'

const ctx = {} as never
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('toAgentskitTools', () => {
  it('projects a descriptor into AgentskitTools (shape + schema + sideEffect)', () => {
    const tools = toAgentskitTools(slackIntegration, { getToken: () => 'xoxb' })
    const post = tools.find((t) => t.name === 'slack_post_message')!
    expect(post.description).toBeTruthy()
    expect(post.parameters).toMatchObject({ type: 'object' })
    expect(post.sideEffect).toBe('external')
    expect(typeof post.execute).toBe('function')
  })

  it('executes with a lazily-resolved token and wraps success as { kind: ok }', async () => {
    let auth = ''
    let url = ''
    const fetchImpl = fakeFetch((u, init) => {
      url = u
      auth = String((init.headers as Record<string, string>).authorization)
      return json({ ok: true, ts: '1.2' })
    })
    const tools = toAgentskitTools(slackIntegration, { getToken: () => 'xoxb-1', fetchImpl })
    const post = tools.find((t) => t.name === 'slack_post_message')!
    const out = await post.execute({ channel: '#g', text: 'hi' }, ctx)
    expect(out).toEqual({ kind: 'ok', value: { ts: '1.2' } })
    expect(url).toContain('chat.postMessage')
    expect(auth).toBe('Bearer xoxb-1')
  })

  it('wraps a thrown provider error as { kind: error }', async () => {
    const fetchImpl = fakeFetch(() => json({ ok: false, error: 'channel_not_found' }))
    const [post] = toAgentskitTools(slackIntegration, { getToken: () => 'x', fetchImpl })
    const out = await post.execute({ channel: 'bad', text: 'x' }, ctx)
    expect(out).toMatchObject({ kind: 'error', code: 'AK_OS_INTEGRATION_FAILED' })
    expect((out as { message: string }).message).toContain('channel_not_found')
  })

  it('threads default headers (github user-agent) and supports `only`', async () => {
    let ua = ''
    const fetchImpl = fakeFetch((_u, init) => {
      ua = String((init.headers as Record<string, string>)['user-agent'] ?? '')
      return json({ items: [{ number: 1, title: 't', html_url: 'u', state: 'open' }] })
    })
    const tools = toAgentskitTools(githubIntegration, { getToken: () => 'ghp', fetchImpl, only: ['github_search_issues'] })
    expect(tools).toHaveLength(1)
    const out = await tools[0]!.execute({ q: 'is:open' }, ctx)
    expect(out).toMatchObject({ kind: 'ok' })
    expect(ua).toBe('agentskit-github-tool')
  })

  it('resolves the token per call (rotation-safe)', async () => {
    const seen: string[] = []
    let n = 0
    const fetchImpl = fakeFetch((_u, init) => {
      seen.push(String((init.headers as Record<string, string>).authorization))
      return json({ ok: true, ts: String(++n) })
    })
    const [post] = toAgentskitTools(slackIntegration, { getToken: () => `tok-${n}`, fetchImpl })
    await post.execute({ channel: 'c', text: 'a' }, ctx)
    await post.execute({ channel: 'c', text: 'b' }, ctx)
    expect(seen[0]).toBe('Bearer tok-0')
    expect(seen[1]).toBe('Bearer tok-1')
  })
})
```

## `.changeset/os-integrations-binding.md`

```md
---
'@agentskit/os-integrations': minor
---

New `@agentskit/os-integrations` package — binds the published `@agentskit/integrations`
catalog into AgentsKit-OS contracts. `toAgentskitTools(integration, opts)` projects a
catalog descriptor into OS `AgentskitTool`s (RFC-0026 `parameters` + the autonomy
`sideEffect` gate), resolving the credential lazily per call (vault-rotation-safe) and
threading service config / per-instance base URL through to the action context. Lets
`os-runtime-agentskit` consume the unified 50-service catalog instead of reimplementing
each provider; connector senders, inbound triggers, OAuth specs, and marketplace
listings follow.
```

---

## Next (P5+, after this lands)

- **P5** — delete `os-runtime-agentskit/src/tools/{slack,github,linear,notion,stripe,twilio,discord,sentry,pagerduty,http,sql}` and wire its tool list through `toAgentskitTools(getIntegration(name), { getToken })`. Add parity tests vs the deleted impls before removing.
- **P6–P10** — `toConnectionSenders` (os-connectors), `toWebhookProviders` + `toIncomingAdapters` (os-triggers), `toOAuthProviderSpecs` (os-oauth), `toListings` (os-marketplace). Each is a thin projection added to this package; keep egress/vault/audit/idempotency in the OS seams.
