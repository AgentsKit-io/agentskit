# Unificação de integrações — análise profunda + arquitetura alvo

> Status: DRAFT para decisão. Data: 2026-06-09. Companheiro de `integrations-split-study.md`.
> Entrega 1 de 2: **análise profunda + plano de unificação** (o "como deve ser"). A Entrega 2
> (plano completo de refatoração nos dois repos) vem após alinhamento desta.
> Base: leitura de conteúdo real de `lib` (local) e `AgentsKit-io/agentskit-os` (privado).

---

## 0. TL;DR

Hoje **uma integração (ex: slack) vive em 6+ lugares com 3–4 implementações HTTP separadas**,
contratos diferentes e shapes divergentes. Não há descritor único de serviço.

**Alvo:** **um descritor canônico por serviço** em `@agentskit/integrations` (OSS livre). Cada
camada (agent-tool, connector outbound, trigger inbound, oauth, notification, marketplace) vira
**projeção fina** desse descritor. Adicionar integração: de "tocar 6 pacotes" → "1 pasta +
registrar". Manutenção: de "corrigir em N" → "1 fonte". Agente: "import + usar".

Viável **sem big-bang**: peer dep já existe, oauth já é declarativo, dispatch opera em runtime,
só 1 superfície frozen (`ConnectionKind` enum) muda — e de forma aditiva.

---

## 1. Análise profunda — superfícies reais hoje

### 1.1 Quatro contratos de "ação" para o MESMO serviço

| Camada | Repo/pacote | Contrato | Schema | Auth | HTTP |
|---|---|---|---|---|---|
| Agent tool (lib) | `tools/integrations/slack.ts` | `defineTool` → `ToolDefinition` | JSON Schema | `config.token` | `httpJson` |
| Agent tool (OS) | `os-runtime-agentskit/tools/slack.ts` | **`AgentskitTool` (local)** | JSON Schema (`parameters`) | `getBotToken: () => string` (lazy) | `os-core/http` (`fetchWithTimeout`,`retryWithBackoff`) |
| Connector outbound | `os-connectors/slack-sender.ts` | `ConnectionSender` | Zod (`target`/`payload`) | `resolveSecret(ref)` (vault) | egress-fetch injetado |
| Notification | `os-notifications/slack-channel.ts` | ad-hoc `dispatchSlackMessage` | — | env/override | fetch próprio (10s) |

→ **4 implementações HTTP do `chat.postMessage`.** Divergem em silêncio.

Detalhes que importam pra unificar:
- `ToolDefinition` (core): `{ name, description?, schema?: JSONSchema7, execute(args,ctx)=>unknown|AsyncIterable, init?, dispose?, tags?, category?, requiresConfirmation? }`. **Sem conceito de trigger** — `stripe-webhook` é modelado como tool comum de "verify".
- `AgentskitTool` (OS): `{ name, description?, parameters?: JSONSchema, sideEffect?: 'none'|'read'|'write'|'destructive'|'external', execute(args,ctx)=>AgentskitToolReturn }`. **Diferenças vs core:** (1) `parameters` vs `schema` (mesmo JSON Schema, nome diferente), (2) retorno `AgentskitToolReturn` discriminado (`{kind:'ok'|'error'}`) vs `unknown`, (3) `sideEffect` alimenta o gate de autonomia, (4) credencial **lazy** `() => string`, (5) `isE2eTestMode` short-circuit.
- **`@agentskit/tools` JÁ é optional peer dep** do `os-runtime-agentskit` (deps diretas: só `node-sql-parser`, `pdfkit`). O binding foi antecipado; só não consome o catálogo.

### 1.2 Trigger inbound — bom design, 1 ponto de co-edição

- `WebhookProvider<TCtx,TEvent> = { kind, verify(input)=>Result<TCtx>, parse(input,ctx)=>TEvent }`,
  registrado via `registerWebhookProvider(provider)` (open/close — **sem switch**).
- Adapter `raw → IncomingEvent` via `buildIncoming(common, source, payload, raw, opts)`.
- `IncomingEvent` = envelope CloudEvents (Zod), `data` discriminado por `source`
  (slack/github/.../s3/mcp), `ExternalThreadRef` p/ session stitch.
- **1 ponto de co-edição restante:** `triggerContractFor(kind)` switch em `os-triggers/registry/contracts.ts` + o union Zod de 15 kinds.
- **Bug latente:** 2 `NormalizedSlackEvent` divergentes (`kinds/slack.ts` tem `threadTs`, `webhooks/webhook-slack.ts` não).

### 1.3 Auth — já declarativo (mover é trivial)

`os-oauth/oauth-hub.ts`: `OAUTH_PROVIDERS: OAuthProviderSpec[]` (14 providers):
```ts
type OAuthProviderSpec = {
  providerId; displayName; authorizationUrl; tokenUrl;
  defaultScopes: string[]; usePkce: boolean; extraAuthParams?: Record<string,string>
}
```
**Zero código por-provider.** Flow `startOAuthFlow`/`completeOAuthFlow` é genérico. Connection
store guarda só metadata (state/scopes); **tokens ficam no vault** (`os-storage`). Credenciais
de app via env `AKOS_OAUTH_<PROVIDER>_CLIENT_ID/SECRET`.

### 1.4 Canônico + frozen + dispatch (o que NÃO pode mover)

- `os-core/integrations` (Zod): `IncomingEvent`, `OutgoingMessage` (`correlationId` obrigatório,
  `idempotencyKey`), `ConnectionSender`, `SessionRegistry`. **Contratos canônicos — o pacote livre
  deve satisfazê-los, não substituí-los.**
- `os-contracts`: `ConnectionKind = z.enum([slack,github,linear,discord,email,cron,file,webhook,
  cdc,twilio,sentry,pagerduty,stripe,s3,mcp,llm])` — **única superfície RFC-frozen (`check:rfc-0007`)
  que nomeia kinds em compile-time.** Tudo mais opera em `connection.kind` (string) em runtime.
- Dispatch (`connection-send-seam.ts`): `parse → store.get(connectionId) → capability check →
  EGRESS GATE → IDEMPOTENCY RING → SIGNED AUDIT → registry.get(kind).send({...,resolveSecret})`.
  **Egress/idempotência/audit/vault disparam ANTES do sender** — ficam no OS, sempre.
- Marketplace: listing `category:'connector'` + `PluginManifest`; **aditivo**, sem FK de integração.
- Ponto de injeção de senders: `createIntegrationConnectionsHandlers(opts.senders)` no boot.

---

## 2. Diagnóstico (resposta direta: espalhado ou no lugar certo?)

**Espalhado.** A *infra* (dispatch, egress, vault, audit, oauth flow, trigger registry) está
**bem desenhada e no lugar certo** — seams limpos, RFC-governados. O que está **errado** é a
**ausência de um descritor de serviço único**: cada serviço é redescrito em 4–6 lugares, com 3–4
HTTP clients, 2 shapes divergentes. Resultado: adicionar/manter exige tocar muitos pontos, e as
cópias derivam.

| Critério | Infra (seams) | Catálogo (por-serviço) |
|---|---|---|
| Desenho | ✅ limpo, RFC-frozen | ❌ espalhado, duplicado |
| Fácil adicionar | n/a | ❌ 6 lugares |
| Manutenção | ✅ | ❌ N cópias |
| À prova de futuro | ✅ | ❌ deriva |

**Tese de unificação: manter a infra, extrair o catálogo para um descritor único.**

---

## 3. Arquitetura alvo — descritor único + projeções finas

### 3.1 O descritor canônico (`@agentskit/integrations`)

```ts
// Núcleo do pacote livre. Uma definição por serviço.
interface Integration {
  name: ConnectionKindSlug          // 'slack' — casa com ConnectionKind do OS
  displayName: string
  categories: string[]              // ['comms']
  http?: { baseUrl: string }        // fatos de transporte compartilhados

  auth: AuthSpec                    // unifica OAUTH_PROVIDERS + apiKey + webhookSecret
  actions: IntegrationAction[]      // 1 fonte p/ agent-tool + connector + notification
  triggers?: IntegrationTrigger[]   // 1 fonte p/ webhook verify/parse + IncomingEvent
  capabilities?: { send?: string; notify?: string }  // ponteiros p/ projeções
}

interface IntegrationAction {
  name: string                      // 'slack_post_message'
  description: string
  schema: JSONSchema7               // canônico (reusa defineTool)
  sideEffect?: 'none'|'read'|'write'|'destructive'|'external'  // p/ gate de autonomia do OS
  sendCapability?: string           // 'chat.postMessage' — id da SendCapability do connector
  execute(args, http): MaybePromise<unknown>   // transporte ÚNICO (httpJson)
}

interface IntegrationTrigger {
  name: string                      // 'slack.message'
  source: IncomingSource            // 'slack' (casa com IncomingEventData)
  verify(input: WebhookInput): VerifyResult        // assinatura
  normalize(raw, ctx): NormalizedEvent             // → payload de IncomingEvent
  externalThreadRef?(raw): ExternalThreadRef       // session stitch
}

type AuthSpec =
  | { kind:'oauth2'; authorizationUrl; tokenUrl; defaultScopes:string[]; usePkce:boolean; extraAuthParams?:Record<string,string> }  // = OAuthProviderSpec
  | { kind:'apiKey'; header:string; envHint?:string }
  | { kind:'webhookSecret'; scheme:'hmac-sha256'|... }
  | { kind:'none' }
```

Princípios:
- **`execute` é o único HTTP.** As 4 cópias colapsam numa. `httpJson` vira base do pacote.
- **`schema` em JSON Schema** (reusa as 40 sem reescrita; consistente com core/`feedback_json-schema-canonical`). Aceita Zod do usuário via `ZodLike` (já existe `tools/src/zod.ts`).
- **`auth` oauth2 = `OAuthProviderSpec` verbatim** → move sem fricção.
- **`triggers` carregam `verify`+`normalize`** → alimentam `WebhookProvider` + `buildIncoming` do OS.
- **`name` = `ConnectionKind` slug** → casa com o enum frozen e o dispatch.

### 3.2 Projeções finas (adapters por camada)

Cada camada deixa de reimplementar e passa a **projetar** o descritor:

| Camada (consumidor) | Adapter (novo, fino) | Lê do descritor | Mantém local |
|---|---|---|---|
| Agent tool lib (`runtime`/`cli`) | `toToolDefinitions(integration)` | `actions` | — (já é `ToolDefinition`) |
| Agent tool OS (`os-runtime-agentskit`) | `toAgentskitTools(integration, {getToken})` | `actions` | `sideEffect` gate, lazy cred, e2e short-circuit |
| Connector outbound (`os-connectors`) | `toConnectionSenders(integration)` | `actions[sendCapability]` | egress-fetch, `resolveSecret`, idempotência, audit |
| Trigger inbound (`os-triggers`) | `toWebhookProvider(integration)` + `toIncomingAdapter` | `triggers` | auto-registro, dispatch, registry |
| Auth (`os-oauth`) | `toOAuthProviderSpec(integration)` | `auth(oauth2)` | flow, vault, connection store |
| Notification (`os-notifications`) | `toNotifChannel(integration)` | `actions[capabilities.notify]` | router/severity |
| Marketplace (`os-marketplace`) | `toListing(integration)` | metadata | listing/install/billing |

**Resultado por serviço:** 1 descritor (pasta `services/slack/`) → 7 projeções automáticas.
Egress/vault/audit/idempotência/billing **permanecem no OS** (disparam antes/around das projeções).

### 3.3 Fluxo "adicionar Slack" — antes × depois

```
ANTES:  tools/integrations/slack.ts (lib)
      + os-runtime-agentskit/tools/slack.ts
      + os-connectors/slack-sender.ts
      + os-triggers/{adapters,kinds,webhooks×2}/slack
      + os-notifications/channels/slack-channel.ts
      + os-oauth/oauth-hub.ts (entry)
      + os-contracts ConnectionKind (já tem)
   = 6 pacotes, ~9 arquivos, 4 HTTP clients

DEPOIS: @agentskit/integrations/services/slack/{index,actions,triggers,auth}.ts
      + registrar no catálogo
   = 1 pasta. Projeções geram o resto.
```

### 3.4 Por que isso é "fácil pro agente"

- lib: `integration.actions` já são `ToolDefinition[]` → `runtime({ tools })` consome direto
  (mecanismo `buildToolMap` atual, sem mudança).
- OS: `toAgentskitTools` devolve `AgentskitTool[]` → `createAgentskitToolExecutor` aceita igual.
- Um `registry.list()` no pacote dá descoberta (`listIntegrations()`, `getIntegration('slack')`).
- MCP: catálogo pode ser exposto via `@agentskit/mcp` server → qualquer agente MCP usa.

---

## 4. Garantias de "à prova de futuro"

1. **Descritor único + projeções** — bug/feature em 1 lugar; camadas projetam.
2. **Template + gerador** — `services/_template/` + `pnpm gen:integration <name>`; estrutura
   idêntica sempre.
3. **Contract tests por serviço** — golden payloads de webhook + validação de schema de action em
   CI. Pega quebra de API externa cedo.
4. **Contract freeze** — `Integration` sob `check:rfc-*` (padrão `[[project_agentskit_os_contract_freeze]]`).
5. **Boundary lint** — `@agentskit/integrations` **nunca** importa `agentskit-os` (proíbe ciclo).
   OS importa o pacote, não o contrário.
6. **Canonicalização única** — resolver os 2 `NormalizedSlackEvent` num só shape no descritor
   (elimina a divergência atual).
7. **Schema canônico** — JSON Schema + `ZodLike`; sem dep dura de Zod no pacote base.
8. **Zero-dep por serviço** — padrão `httpJson`/`node:crypto`; SDK externo só `optionalDependencies`
   + `sideEffects:false` p/ tree-shaking.

---

## 5. Pontos de risco da unificação (a tratar na Entrega 2)

| Risco | Detalhe | Mitigação |
|---|---|---|
| 4 contratos divergentes | core `ToolDefinition` vs OS `AgentskitTool` (`schema`/`parameters`, retorno, `sideEffect`) | adapter de projeção mapeia campos; testes de paridade antes de apagar |
| 3–4 HTTP clients | comportamentos sutis (Slack `ok:false`, Stripe form-encoded+idempotency, retry/timeout) | descritor `execute` absorve quirks; golden tests por action |
| Shapes divergentes | 2 `NormalizedSlackEvent` | canonicalizar no descritor (single source) |
| `ConnectionKind` frozen | adicionar kind = mudar enum RFC-frozen | enum extension PR (única mudança frozen), aditiva; `api:update` |
| Inversão de dep | OS (privado) passa a depender de pacote público | direção saudável; boundary lint proíbe ciclo |
| Apagar `os-runtime/tools` | quebra fluxos atuais | mapear 1:1 + testes paridade antes de deletar |
| Auth: app creds | OAuth client id/secret via env OS-side | descritor traz só spec público (urls/scopes); secret fica no OS/vault |

---

## 6. Boundary free vs OS (open-core) — recap

| Componente | Onde | Razão |
|---|---|---|
| Descritor `Integration` (actions+triggers+auth spec) + `execute` HTTP | **FREE** `@agentskit/integrations` | catálogo = commodity/adoção |
| `verify`/`normalize` de webhook | **FREE** | gancho de adoção |
| OAuth2 spec (urls/scopes) + flow genérico + token-store *interface* | **FREE** | padrão |
| Egress gate, signed audit, idempotency ring | **OS** | dispara around das projeções; diferencial |
| Vault/sealer (resolveSecret, AES-256-GCM, keychain) | **OS** | secret material |
| Multi-tenant connection store, app client secrets | **OS** | enterprise |
| Marketplace (listing/install/billing/signing/SBOM) | **OS** | monetização |

---

## 7. Decisões pendentes (destravam a Entrega 2)

1. **Aprovar a arquitetura §3** (descritor único + projeções finas)?
2. **Apagar `os-runtime-agentskit/src/tools/*` duplicados** e consumir o pacote? (recomendo sim)
3. **Schema:** JSON Schema + `ZodLike` (recomendado) ou Zod 1:1 com OS?
4. **Boundary §6** confirmado?
5. **Escopo da Entrega 2:** faseado não-breaking (mover 40 → parar duplicação OS → projeções →
   ondas de catálogo)? Ou priorizar largura primeiro?
6. **`@agentskit/mcp` split + expor catálogo via MCP** entra no mesmo RFC?

> Após aprovação desta entrega, escrevo a **Entrega 2: plano completo de refatoração** — passo a
> passo, arquivo a arquivo, changesets, ordem de PRs nos dois repos, contract tests, e a sequência
> que mantém tudo verde (gates) sem big-bang.
```
