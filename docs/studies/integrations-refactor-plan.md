# Entrega 2 — Plano completo de refatoração (lib + agentskit-os)

> Status: APROVADO (arquitetura §3 de `integrations-unification.md`). Data: 2026-06-09.
> Decisões travadas: descritor único + projeções finas · apagar duplicatas `os-runtime/tools/*` ·
> schema JSON Schema + `ZodLike` · boundary open-core confirmado · MCP split em fase própria.
> Execução **faseada, não-breaking, gates sempre verdes**. Sem big-bang.

Convenção: `[lib]` = repo `EmersonBraun/lib` · `[os]` = `AgentsKit-io/agentskit-os`.
`+`=criar `~`=editar `-`=deletar. Changeset semver por pacote em cada PR.

---

## 0. Visão das fases e ordem de PR

| PR | Fase | Repo | Entrega | Quebra? |
|---|---|---|---|---|
| P1 | Fundação | lib | `@agentskit/integrations` (contrato+http+registry+gen+CI) | não (pacote novo) |
| P2 | Mover 40 | lib | 40 → `services/*` + re-export deprecado em `tools` | não (alias) |
| P3 | Projeção lib | lib | `toToolDefinitions` + runtime/cli consomem catálogo | não |
| P4 | Binding OS | os | `@agentskit/os-integrations` (adapters de projeção) | não (pacote novo) |
| P5 | Parar duplicação | os | `os-runtime-agentskit` consome catálogo, **deleta `tools/*`** | interno (paridade testada) |
| P6 | Connectors | os | `os-connectors` projeta `actions[sendCapability]` | não |
| P7 | Triggers | os | `os-triggers` projeta `verify/normalize` + canoniza Slack | corrige bug |
| P8 | OAuth | os | `os-oauth` lê `auth(oauth2)` do catálogo | não |
| P9 | Notifications | os | `os-notifications` projeta `capabilities.notify` | não |
| P10 | Marketplace | os | `toListing` gera listings do catálogo | aditivo |
| P11 | Ondas catálogo | lib | +30 serviços (Ondas 1→3) | aditivo |
| P12 | MCP | lib | `@agentskit/mcp` split + catálogo via MCP | major tools |

Regra de verde: cada PR passa `pnpm check:all` (lib) / `pnpm check:rfc-0007`+build+test (os)
isoladamente. OS só consome versão **publicada** do catálogo (não workspace cross-repo).

---

## 1. P1 — Fundação `@agentskit/integrations` [lib]

**Objetivo:** pacote novo, vazio de serviços, com contrato congelável. Nada quebra (ninguém usa ainda).

Arquivos:
```
+ packages/integrations/package.json          # name @agentskit/integrations; dep: @agentskit/core; tsup dual CJS/ESM
+ packages/integrations/tsup.config.ts         # entries: index + services/* + auth + mcp (subpaths)
+ packages/integrations/src/contract.ts        # Integration, IntegrationAction, IntegrationTrigger, AuthSpec, NormalizedEvent, WebhookInput, VerifyResult
+ packages/integrations/src/http.ts            # MOVER de tools/src/integrations/http.ts (httpJson, HttpToolOptions)
+ packages/integrations/src/registry.ts        # createRegistry(), listIntegrations(), getIntegration(name)
+ packages/integrations/src/index.ts           # re-export contract + registry + http
+ packages/integrations/src/services/_template/ # gabarito: index.ts, actions.ts, triggers.ts, auth.ts, README
+ packages/integrations/src/zod-bridge.ts      # re-export ZodLike de tools/src/zod.ts (ou mover p/ core; ver nota)
~ pnpm-workspace.yaml                           # (já cobre packages/*) — confirmar
~ turbo.json                                    # pipeline herdada
```

Contrato (`contract.ts`) = §3.1 do doc de unificação. Pontos finos:
- `IntegrationAction.execute(args, http)` recebe `http` (cliente `httpJson` já com auth aplicada
  pela camada de `auth`) → action não conhece token, só chama endpoints. Absorve quirks (Slack
  `ok:false`, Stripe form-encoded) dentro do `execute`.
- `schema: JSONSchema7` (canônico). `IntegrationAction.sideEffect` p/ o gate de autonomia do OS.
- `sendCapability?: string` (id da SendCapability do connector, ex `'chat.postMessage'`).

Tooling à prova de futuro:
```
+ scripts/gen-integration.ts                   # `pnpm gen:integration <name>` copia _template + registra
+ packages/integrations/src/testing/contract-test.ts  # harness: valida schema de cada action + golden webhook por trigger
~ package.json (root)                           # script "gen:integration", "check:integrations-contract"
+ .changeset/integrations-foundation.md         # minor: new package
```
Freeze: adicionar `check:rfc-integrations` (espelha `check:rfc-0007`) sobre a superfície pública de
`contract.ts` + `registry.ts`. `pnpm api:update` após mudança intencional.

**Nota Zod bridge:** `ZodLike` vive em `tools/src/zod.ts`. Opção limpa: **mover `ZodLike`/`defineZodTool`
para `@agentskit/core`** (é contrato puro, zero-dep — respeita `[[feedback_zero-dep-core]]`) e
re-exportar de tools (deprecado) + usar em integrations. Decidir em P1; barato.

Gate: `pnpm --filter @agentskit/integrations build test` verde. Resto do monorepo intocado.

---

## 2. P2 — Mover as 40 + alias deprecado [lib]

**Objetivo:** catálogo real, sem quebrar quem importa `@agentskit/tools/integrations/*`.

Por serviço (×40), exemplo `slack`:
```
+ packages/integrations/src/services/slack/actions.ts   # recorte de tools/src/integrations/slack.ts (defineTool → IntegrationAction)
+ packages/integrations/src/services/slack/auth.ts      # AuthSpec { kind:'apiKey'|'oauth2' }
+ packages/integrations/src/services/slack/triggers.ts  # se houver (stripe-webhook, postgres-cdc)
+ packages/integrations/src/services/slack/index.ts     # define Integration{...}; registra no registry
```
- `http.ts` já movido em P1; ajustar imports das 40.
- `stripe-webhook.ts`/`postgres-cdc.ts` → viram `triggers` reais (deixam de ser "tool de verify"):
  `verify`+`normalize`. Primeira materialização do conceito de trigger.

Compat em tools (não quebra consumidores):
```
~ packages/tools/src/integrations/slack.ts     # vira shim: re-export from '@agentskit/integrations/services/slack' + @deprecated JSDoc
~ packages/tools/src/integrations/index.ts      # re-exports apontam p/ shims
~ packages/tools/package.json                   # + dep @agentskit/integrations (workspace:*)
- packages/tools/src/integrations/http.ts        # movido; deixar shim re-export
+ .changeset/integrations-move-40.md             # integrations: minor (catálogo) ; tools: MAJOR (origem mudou, embora alias preserve runtime)
```
`discovery.ts` **não muda** (nunca tocou integrations).

Verificação:
```
+ packages/tools/tests/integration-alias.test.ts # garante shims re-exportam mesma fn (identidade)
```
Gate: `pnpm --filter @agentskit/tools test`, `--filter @agentskit/integrations test` verdes.
Migração doc: `docs/migration/tools-integrations-to-integrations.md` (mapa import antigo→novo).

---

## 3. P3 — Projeção lib + consumo runtime/cli [lib]

**Objetivo:** agente da lib usa catálogo direto. `actions` já são `ToolDefinition`-compatíveis.

```
+ packages/integrations/src/project/to-tool-definitions.ts  # Integration → ToolDefinition[] (mapeia execute(args,http)→execute(args,ctx) injetando http c/ auth)
~ packages/integrations/src/index.ts                         # export toToolDefinitions
```
Consumo (exemplos, opcional — runtime já aceita `ToolDefinition[]`):
```
~ packages/runtime/README / examples                         # mostrar `tools: toToolDefinitions(github({token}))`
~ packages/cli/src/run.ts                                     # resolveTools aceita nome de integração do catálogo (getIntegration)
+ .changeset/integrations-projection-lib.md                  # minor
```
Sem mudança no `buildToolMap`/`RuntimeConfig` (já é `ToolDefinition[]`). Zero breaking.
Gate: `pnpm check:all` (lib).

**→ Marco: lib unificada. Publicar `@agentskit/integrations` no npm** (P1–P3) p/ o OS consumir versão real.

---

## 4. P4 — Binding package no OS [os]

**Objetivo:** uma única aresta de dependência OS→catálogo. Pacote fino que projeta o descritor nos
contratos do OS. Mantém os seams (egress/vault/audit) fora.

```
+ packages/os-integrations/package.json    # name @agentskit/os-integrations; deps: @agentskit/integrations (npm), @agentskit/os-core (workspace)
+ packages/os-integrations/src/to-agentskit-tools.ts   # Integration → AgentskitTool[] (schema→parameters, retorno→AgentskitToolReturn, getToken lazy, sideEffect, e2e short-circuit)
+ packages/os-integrations/src/to-connection-senders.ts # Integration → ConnectionSender[] (actions[sendCapability]; usa resolveSecret + egress-fetch injetados)
+ packages/os-integrations/src/to-webhook-providers.ts  # Integration → WebhookProvider[] (verify/parse a partir de triggers)
+ packages/os-integrations/src/to-incoming-adapters.ts  # triggers.normalize → buildIncoming(IncomingEvent)
+ packages/os-integrations/src/to-oauth-provider-specs.ts # auth(oauth2) → OAuthProviderSpec
+ packages/os-integrations/src/to-listings.ts           # Integration → MarketplaceListing (category:'connector')
+ packages/os-integrations/src/index.ts
+ packages/os-integrations/tests/parity/*.test.ts       # paridade: projeção vs implementação OS atual (golden)
+ .changeset/os-integrations-binding.md                 # minor: new package
```
**Crítico (paridade):** antes de qualquer deleção no OS, os testes de paridade comparam o output das
projeções com as implementações atuais (mesmos args → mesmo request HTTP / mesmo IncomingEvent).
Trava regressão.

Gate: `pnpm --filter @agentskit/os-integrations build test` + `check:rfc-0007` (não toca superfície
contratual ainda).

---

## 5. P5 — Parar duplicação: `os-runtime-agentskit` consome catálogo [os]

**Objetivo:** deletar os 11 tools duplicados; agente do OS usa o catálogo via binding.

```
~ packages/os-runtime-agentskit/package.json   # @agentskit/tools/@agentskit/integrations de optional→peer dep efetiva; + @agentskit/os-integrations
~ packages/os-runtime-agentskit/src/<wiring>   # onde hoje monta os tools: trocar createXTools locais por toAgentskitTools(getIntegration(name), {getToken,...})
- packages/os-runtime-agentskit/src/tools/slack.ts
- packages/os-runtime-agentskit/src/tools/github.ts
- packages/os-runtime-agentskit/src/tools/linear.ts
- packages/os-runtime-agentskit/src/tools/notion.ts
- packages/os-runtime-agentskit/src/tools/stripe.ts
- packages/os-runtime-agentskit/src/tools/twilio.ts
- packages/os-runtime-agentskit/src/tools/discord.ts
- packages/os-runtime-agentskit/src/tools/sentry.ts
- packages/os-runtime-agentskit/src/tools/pagerduty.ts
- packages/os-runtime-agentskit/src/tools/http.ts          # se equivalente no catálogo
  (manter locais SEM equivalente: fs, shell, git-diff, llm, memory, rag-search, pdf-generator, sql, file-reader, web-search, read-helpers)
~ packages/os-runtime-agentskit/src/tools/index.ts          # remover exports deletados; manter os locais
+ .changeset/os-runtime-consume-catalog.md                  # minor (interno; sem mudança de contrato público)
```
`createAgentskitToolExecutor` aceita `AgentskitTool[]` de qualquer origem → assinatura intocada.
Preservar deltas OS no adapter `to-agentskit-tools`: `sideEffect` (gate autonomia), `getToken` lazy,
`isE2eTestMode` short-circuit, retry/timeout via `os-core/http` (passar como `http` runner).

Verificação: testes de paridade P4 + e2e existentes (`conn-ext-integrations.spec.ts`).
Gate: build+test os; `check:rfc-0007` verde (sem mudança de superfície).

---

## 6. P6 — Connectors projetam o catálogo [os]

```
~ packages/os-connectors/src/slack-sender.ts   # createSlackConnectionSender passa a derivar endpoint/payload de getIntegration('slack').actions[sendCapability]; mantém send()+resolveSecret+egress
~ ... github/discord/email/linear/webhook senders idem
~ packages/os-connectors/src/connector-senders.ts # createConnectorSenders pode gerar via toConnectionSenders(catalog) — OU manter lista explícita chamando adapters
~ packages/os-connectors/package.json           # + @agentskit/os-integrations
+ .changeset/os-connectors-project-catalog.md    # patch/minor (interno)
```
SendCapability constants (`SLACK_POST_MESSAGE`) migram p/ `action.sendCapability` no catálogo;
connector lê de lá (remove a 2ª cópia de HTTP). Egress/idempotência/audit ficam no
`connection-send-seam` (intocado).
Gate: `appendAuditLedgerEntry`/egress tests verdes; paridade de request.

---

## 7. P7 — Triggers projetam + canonização Slack [os]

```
~ packages/os-triggers/src/webhooks/webhook-slack.ts   # verify/parse derivam de getIntegration('slack').triggers (single source)
~ packages/os-triggers/src/kinds/slack.ts               # ELIMINAR 2º NormalizedSlackEvent — usar o canônico do catálogo (inclui threadTs)
~ packages/os-triggers/src/adapters/slack-incoming.ts   # normalize via catálogo → buildIncoming
~ ... github/linear/discord/twilio/sentry/pagerduty/stripe/s3 idem
~ packages/os-triggers/src/webhooks/webhook-provider-registry.ts # registrar via toWebhookProviders(catalog)
~ packages/os-triggers/src/registry/contracts.ts        # triggerContractFor: gerar variantes do catálogo (reduz o switch)
~ packages/os-triggers/package.json                      # + @agentskit/os-integrations
+ .changeset/os-triggers-project-catalog.md              # patch/minor; FIX divergência NormalizedSlackEvent
```
**Corrige o bug** das 2 shapes. `IncomingEvent`/`buildIncoming` (os-core) intocados — catálogo
satisfaz o contrato, não substitui.
Gate: golden webhook tests; `check:rfc-0007`.

---

## 8. P8 — OAuth lê o catálogo [os]

```
~ packages/os-oauth/src/oauth-hub.ts   # OAUTH_PROVIDERS = catalog.filter(auth.kind==='oauth2').map(toOAuthProviderSpec)  (ou merge: catálogo + extras OS-only)
~ packages/os-oauth/package.json        # + @agentskit/os-integrations
+ .changeset/os-oauth-from-catalog.md   # patch
```
Flow `startOAuthFlow`/`completeOAuthFlow`, connection store, token-persist/vault: **intocados**
(genéricos). App client id/secret continuam via env `AKOS_OAUTH_*` (OS-side, nunca no catálogo).
Gate: oauth flow tests verdes.

---

## 9. P9 — Notifications projetam [os]

```
~ packages/os-notifications/src/channels/slack-channel.ts # dispatchSlackMessage usa action do catálogo (capabilities.notify) — elimina 3ª cópia HTTP Slack
~ ... discord-channel/email-channel idem
~ packages/os-notifications/package.json                   # + @agentskit/os-integrations
+ .changeset/os-notifications-project-catalog.md           # patch
```
Router/severity/dedup (`router-adapter`, os-observability): intocados.
Gate: notifications tests.

---

## 10. P10 — Marketplace gera listings do catálogo [os]

```
+ packages/os-marketplace/src/catalog-listings.ts   # toListing(integration) → MarketplaceListing{category:'connector', id=name, integrityHash, compat}
~ packages/os-marketplace/src/<seed/registry>        # seed inicial a partir do catálogo
+ .changeset/os-marketplace-catalog-listings.md      # minor (aditivo)
```
**ConnectionKind enum (RFC-frozen):** se algum serviço novo do catálogo não estiver no enum →
PR de extensão do enum em `os-contracts` (única mudança frozen, aditiva) + `pnpm api:update`.
Listing/install/billing/signing/SBOM: intocados.
Gate: `check:rfc-0007` (enum diff intencional aprovado), marketplace tests.

---

## 11. P11 — Ondas de catálogo (+30) [lib]

Cada serviço = 1 PR (ou agrupado por onda), `pnpm gen:integration <name>`, contract test obrigatório.
Mapa do Activepieces (auth+actions+triggers) — **código próprio via `httpJson`, nunca copiar**.

- Onda 1 (ausências alto uso): gmail, google-calendar, jira, hubspot, airtable, shopify
- Onda 2 (pedidos): telegram, whatsapp, sendgrid, mailchimp, intercom, salesforce, pipedrive,
  google-drive, dropbox, cal-com
- Onda 3 (CRM/automação/AI/cloud): attio, apollo, asana, calendly, acuity, box, amazon-s3/ses/sns/sqs,
  amazon-bedrock, azure-openai, assemblyai, webhook+schedule genéricos

Cada serviço novo no catálogo → aparece no OS via P4–P10 automaticamente (tool, sender se
`sendCapability`, trigger se `triggers`, oauth se `auth.oauth2`, listing). `+ .changeset` por serviço.
Gate: `check:integrations-contract` + build/test.

---

## 12. P12 — MCP split + catálogo via MCP [lib] (opcional, paralelo)

```
+ packages/mcp/* (de packages/tools/src/mcp + mcp-devtools)   # @agentskit/mcp (client/server/devtools)
~ packages/tools/src/mcp/*                                      # shim deprecado → @agentskit/mcp
+ packages/integrations/src/mcp/server.ts                      # expõe catálogo como MCP tools (qualquer agente MCP usa)
+ .changeset/mcp-split.md                                      # tools: MAJOR ; mcp: minor
```
Gate: `pnpm check:all`.

---

## 13. Changesets & versionamento (resumo)

| Pacote | Bump | Quando |
|---|---|---|
| `@agentskit/integrations` (novo) | 0.x minor a cada fase | P1,P2,P3,P11,P12 |
| `@agentskit/tools` | **major** (origem moveu; alias preserva runtime) | P2; major2 em P12 (mcp) |
| `@agentskit/core` | minor (se mover ZodLike) | P1 |
| `@agentskit/os-integrations` (novo) | minor | P4 |
| `os-runtime-agentskit` | minor (interno) | P5 |
| `os-connectors`/`os-triggers`/`os-oauth`/`os-notifications` | patch/minor | P6–P9 |
| `os-marketplace` | minor (aditivo) | P10 |
| `os-contracts` | minor (enum extension, se preciso) | P10 |

---

## 14. Contract tests & gates (rede de segurança)

1. **Alias identity** (P2): shims de tools re-exportam a mesma função.
2. **Paridade** (P4, pré-deleção): projeção OS == implementação atual (request HTTP / IncomingEvent
   idênticos) por serviço. **Bloqueia P5–P9.**
3. **Action schema** (P11): JSON Schema de cada action válido + exemplo executa (mock fetch).
4. **Golden webhook** (P7): payloads reais → `verify`+`normalize` estáveis.
5. **Freeze**: `check:rfc-integrations` (lib) + `check:rfc-0007` (os) por PR.
6. **Boundary lint**: `@agentskit/integrations` não importa `agentskit-os` (regra dep-cruzada).
7. **Verde isolado**: cada PR passa `check:all`/`check:rfc-0007`+build+test sozinho.

---

## 15. Rollback & ordem segura

- P1–P3 (lib) e P4 (os) são **puramente aditivos** → rollback = remover pacote/PR.
- P5–P9 deletam/editam OS: cada um atrás de **testes de paridade** (P4). Rollback = reverter o PR;
  shims/implementações antigas só somem quando paridade verde por ≥1 release.
- Publicar `@agentskit/integrations` no npm **antes** de P4 (OS consome versão fixa, não workspace).
- Nunca deletar `os-runtime/tools/*` (P5) antes da paridade + e2e verdes.
- `ConnectionKind` enum: só estende em P10/P11 quando serviço real precisa, com `api:update`.

---

## 16. Resumo executável (caminho crítico)

```
P1 → P2 → P3 → [publicar @agentskit/integrations npm] → P4 → P5 (deletar duplicatas)
   → P6 → P7 (fix Slack) → P8 → P9 → P10 → P11 (ondas) ; P12 (mcp) em paralelo a partir de P3
```
Resultado: 1 descritor por serviço, 4 HTTP→1, 0 duplicação OS↔lib, adicionar=1 pasta, agentes
consomem direto (lib `ToolDefinition` / OS `AgentskitTool` / MCP), infra OS (egress/vault/audit/
marketplace) intacta e proprietária.
```
