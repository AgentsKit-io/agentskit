# Estudo: integrações para o AgentsKit-OS (AKOS) — catálogo único, simples, à prova de futuro

> Status: DRAFT para decisão. Autor: sessão Claude + EmersonBraun. Data: 2026-06-09.
> **Foco: AKOS.** O AKOS precisa de largura de integrações, reusando o que já existe,
> de forma **simples de adicionar, manter e evoluir**. Este estudo (1) diagnostica que a
> camada de integração do AKOS está **espalhada e duplicada**, (2) propõe um **catálogo
> único** (`@agentskit/integrations`, OSS livre) que o AKOS consome via adapters finos, e
> (3) entrega plano de migração + catálogo priorizado (~30, mapeado do Activepieces).

---

## 0. TL;DR

- **As 40 integrações da lib NÃO estão no AKOS.** ~21 ausentes; ~19 presentes só como
  trigger/sender/storage com cobertura de action menor. AKOS **não tem catálogo de actions**.
- **Pior: o AKOS DUPLICA.** `os-runtime-agentskit/src/tools/` reimplementa slack/github/
  linear/notion/stripe/twilio/etc — sem depender de `@agentskit/tools`. Mesma integração
  reescrita 2×.
- **A camada está ESPALHADA.** Uma integração (ex: slack) vive em **5 pacotes / ~8 arquivos**
  sem fonte única. Adicionar uma nova = tocar 5 lugares. **Não é à prova de futuro.**
- **Activepieces vale — como mapa, não código.** É exatamente a largura de catálogo que falta.
- **Solução:** `Integration` canônico único no pacote livre; cada camada do AKOS (runtime-tool,
  connector, trigger, notification, oauth) vira **adapter fino** que lê dessa definição única.
  Adicionar integração passa de "tocar 5 pacotes" para "1 arquivo + registrar".

---

## 1. Diagnóstico: a integração no AKOS está espalhada (evidência)

### 1.1 Onde uma integração vive HOJE no AKOS — exemplo `slack`

| # | Arquivo | Pacote | Papel |
|---|---|---|---|
| 1 | `src/tools/slack.ts` | `os-runtime-agentskit` | action de agente (**duplica a lib**) |
| 2 | `src/slack-sender.ts` | `os-connectors` | sender outbound (`ConnectionSender`) |
| 3 | `src/adapters/slack-incoming.ts` | `os-triggers` | normaliza evento inbound |
| 4 | `src/kinds/slack.ts` | `os-triggers` | config Zod do trigger |
| 5 | `src/webhooks/webhook-slack.ts` | `os-triggers` | handler webhook |
| 6 | `src/webhooks/webhook-slack-autoregister.ts` | `os-triggers` | auto-registro webhook |
| 7 | `src/channels/slack-channel.ts` | `os-notifications` | canal de notificação |
| 8 | (oauth provider config) | `os-oauth` | flow auth |

→ **5 pacotes, ~8 arquivos, zero fonte única.** github = padrão igual (sender + tool +
trigger adapter/kind/webhook). Não há registry central que cruze connector+trigger+tool+oauth
por serviço — `os-triggers/registry` cobre **só triggers**.

### 1.2 Duplicação confirmada: `os-runtime-agentskit/src/tools/`

Reimplementa, **sem depender de `@agentskit/tools`** (deps reais: `node-sql-parser`, `pdfkit`):
```
discord, github, http, linear, notion, pagerduty, sentry, slack, sql, stripe, twilio
```
São os mesmos serviços que a lib já tem em `@agentskit/tools/integrations`. **Trabalho feito 2×,**
divergem com o tempo, bug corrigido num lado não no outro. Débito clássico.

### 1.3 Veredito de arquitetura

| Critério | Estado atual | Nota |
|---|---|---|
| Fonte única por integração | ❌ espalhado em 5 pacotes | ruim |
| Reuso da lib | ❌ reimplementa | ruim |
| Fácil adicionar | ❌ tocar 5 lugares, sem template | ruim |
| Manutenção | ❌ correção em N lugares | ruim |
| À prova de futuro | ⚠️ infra boa (triggers/oauth/egress), mas sem coesão de catálogo | médio |

A **infra** do AKOS é forte (triggers, oauth, webhooks, egress, vault, marketplace). O que
falta é **coesão**: um lugar canônico onde "uma integração" é descrita inteira, e adapters
finos que projetam essa descrição em cada camada.

---

## 2. As 40 da lib × AKOS (overlap)

| Status no AKOS | Serviços |
|---|---|
| **Ausente total** (21) | github-actions, gmail, teams (MS Teams), hubspot, shopify, jira, airtable, figma, google-calendar, cloudflare-r2, openai-images, elevenlabs, deepgram, whisper, firecrawl, browser-agent, reader, maps, weather, coingecko, document-parsers |
| **Parcial — só trigger/sender/tool** (9) | github, slack, discord, linear, email, twilio, stripe, sentry, pagerduty |
| **Parcial — só storage/rag** (8) | postgres, s3, sqlite, notion, confluence (+ rag: drive/dropbox/gcs/onedrive) |
| genérico (2) | http, sqlite-query |

Mesmo os "parciais" cobrem **menos actions** que a lib (ex: AKOS github = comment+push trigger;
lib github = search/create/comment). **A largura de action da lib é, na prática, ausente no AKOS.**

---

## 3. Activepieces — vale adicionar ao AKOS?

**Sim. É precisamente o gap.** AKOS tem a infra difícil; falta **largura de catálogo**
(400 serviços × actions + auth shapes + triggers). Activepieces resolve isso — **como mapa**:

- ✅ Usar como referência: quais serviços, qual auth, quais actions/triggers principais.
- ❌ **Não copiar código** — pieces têm licenças/deps variadas (core MIT, mas peças não
  garantidas). Reimplementar limpo via `httpJson`. Sem atribuição herdada, sem risco copyleft.

---

## 4. Arquitetura alvo: catálogo único → adapters finos no AKOS

### 4.1 Princípio

**Uma integração = uma definição.** Vive em `@agentskit/integrations` (livre). Cada camada do
AKOS lê dessa definição em vez de reimplementar.

```
@agentskit/integrations (OSS livre)
  services/slack/
    index.ts     →  Integration { auth, actions[], triggers[] }
    actions.ts   →  postMessage, search, ... (defineTool / httpJson)
    triggers.ts  →  normalize + verify (webhook signature)
    auth.ts      →  AuthSpec (oauth2 scopes | apiKey)
        ↓ consumido por adapters FINOS no AKOS
agentskit-os
  os-runtime-agentskit  → tool adapter: integration.actions → agent tools   (deixa de reimplementar)
  os-connectors         → sender adapter: integration.actions[send] + egress/audit/vault
  os-triggers           → trigger adapter: integration.triggers + webhook infra/auto-registro
  os-notifications      → channel adapter: integration.actions[notify]
  os-oauth              → consome integration.auth (scopes/urls) no flow
  os-marketplace        → lista integrations como pieces instaláveis
```

### 4.2 Contrato (`@agentskit/integrations`)

```ts
interface Integration {
  name: string                 // 'slack'
  displayName: string
  categories: string[]         // ['comms']
  auth: AuthSpec
  actions: ToolDefinition[]    // reusa defineTool — vira agent-tool no AKOS sem reescrita
  triggers?: TriggerSpec[]     // normalize + verify — alimenta os-triggers
  capabilities?: {             // hints pros adapters do AKOS projetarem a definição
    notify?: string            // qual action é canal de notificação
    send?: string              // qual action é o sender canônico
  }
}
```
Princípios:
- **actions = `Tool`** → `os-runtime-agentskit` para de reimplementar; só mapeia.
- **triggers** carregam `normalize`/`verify` → `os-triggers` injeta egress/audit/auto-registro.
- **auth declarativo** → `os-oauth` lê scopes/urls; o flow seguro/vault fica no AKOS.
- **`capabilities`** = ponteiros pra notification/sender saberem qual action usar — sem
  duplicar lógica.

### 4.3 "Adicionar 1 integração": antes × depois

| | Hoje (AKOS) | Alvo |
|---|---|---|
| Arquivos a tocar | ~8, em 5 pacotes | **1 pasta** `services/X/` no pacote livre |
| Action de agente | reescrever em `os-runtime/tools` | grátis (adapter lê `actions`) |
| Trigger | adapter+kind+webhook+autoregister | `triggers.ts` (normalize/verify); infra é genérica |
| Notificação | `os-notifications/channels/X` | grátis se `capabilities.notify` setado |
| Auth | config espalhada | `auth.ts` declarativo |
| Manutenção de bug | corrigir em N lugares | 1 lugar |

→ Adicionar serviço = **escrever uma pasta + registrar**. À prova de futuro.

### 4.4 Schema: Zod vs JSON Schema
- lib/core: JSON Schema canônico, dep-free (`feedback_json-schema-canonical`). AKOS: Zod.
- `@agentskit/integrations` não é core → pode ter dep, mas recomendo **JSON Schema nas actions**
  (reusa as 40 sem reescrita, consistente) + **`ZodLike` estrutural** (já existe `tools/src/zod.ts`)
  pra aceitar Zod do usuário sem dep dura. Triggers do AKOS (hoje Zod) são **traduzidos uma vez**
  na migração para o evento canônico do pacote.

---

## 5. Catálogo priorizado para o AKOS (~30, mapeado do Activepieces)

Auth: `key`=API key/token · `oauth2`=OAuth2 · `webhook`=assinatura. Actions/triggers = principais.

### Onda 1 — preencher ausências de alto uso (6)
| Serviço | Auth | Actions principais | Triggers |
|---|---|---|---|
| gmail | oauth2 | send, list, get, modifyLabels, draft | new-email |
| google-calendar | oauth2 | listEvents, createEvent, updateEvent, freeBusy | event-start |
| jira | oauth2/key | createIssue, updateIssue, search(JQL), comment, transition | issue-created/updated |
| hubspot | oauth2 | upsertContact, createDeal, search, addNote | contact/deal-changed |
| airtable | key | listRecords, createRecord, updateRecord, deleteRecord | record-created |
| shopify | key | listOrders, createProduct, updateInventory, getCustomer | order-created |

### Onda 2 — novos pedidos de alto valor (10)
| Serviço | Auth | Actions principais | Triggers |
|---|---|---|---|
| telegram | key | sendMessage, sendPhoto, editMessage, answerCallback | new-message (webhook) |
| whatsapp (cloud API) | key | sendMessage, sendTemplate, markRead | inbound-message |
| sendgrid | key | sendEmail, addContact, sendTemplate | (delivery webhook) |
| mailchimp | oauth2/key | addMember, updateMember, sendCampaign, tagMember | subscribe/unsubscribe |
| intercom | oauth2 | createContact, sendMessage, tagUser, createTicket | conversation-created |
| salesforce | oauth2 | createRecord, updateRecord, SOQL query, upsert | record-changed (CDC) |
| pipedrive | oauth2/key | createDeal, updatePerson, search, addActivity | deal-updated |
| google-drive | oauth2 | upload, download, list, createFolder, share | file-added |
| dropbox | oauth2 | upload, download, list, share, move | file-added |
| cal-com | key | listBookings, createBooking, cancel, availability | booking-created |

### Onda 3 — CRM/automação/AI/cloud (14)
| Serviço | Auth | Actions principais | Triggers |
|---|---|---|---|
| attio | key | createRecord, updateRecord, query, addNote | record-changed |
| apollo | key | searchPeople, enrichContact, createContact | — |
| asana | oauth2/key | createTask, updateTask, addComment, listProjects | task-changed |
| calendly | oauth2 | listEvents, getInvitee, cancel | invitee-created |
| acuity | key | listAppointments, scheduleAppointment, cancel | appointment-scheduled |
| box | oauth2 | upload, download, list, share | file-uploaded |
| amazon-s3 | key/IAM | putObject, getObject, list, presign | (s3-event via triggers) |
| amazon-ses | key/IAM | sendEmail, sendTemplated | (bounce/complaint webhook) |
| amazon-sns | key/IAM | publish, subscribe | (topic notification) |
| amazon-sqs | key/IAM | sendMessage, receiveMessage, deleteMessage | queue-message |
| amazon-bedrock | key/IAM | invokeModel, converse, embed | — |
| azure-openai | key | chat, embed, completions | — |
| assemblyai | key | transcribe, getTranscript, lemur | transcript-ready |
| webhook + schedule (genéricos) | webhook/none | postWebhook, cron emit | inbound-webhook / cron |

**Completar os parciais** (sem novo serviço): adicionar à lib/pacote as actions que faltam em
github (search/issues), slack (richer), linear, notion, stripe (refund/customer), antes de
re-projetar no AKOS.

---

## 6. Plano de migração (AKOS-first, não-breaking)

**Fase 0 — Catálogo único.** Criar `@agentskit/integrations`: contrato §4.2, `http.ts`,
`registry.ts`. RFC + `check:rfc-*` pra congelar o contrato público.

**Fase 1 — Mover as 40 da lib** → `services/*`. Re-export deprecado em `@agentskit/tools`
(não quebra; changeset major tools / minor integrations).

**Fase 2 — AKOS para de duplicar (maior ganho).** `os-runtime-agentskit` passa a **depender de
`@agentskit/integrations`** e mapear `integration.actions → agent tools`. **Apagar**
`os-runtime-agentskit/src/tools/{slack,github,linear,notion,stripe,twilio,discord,sentry,pagerduty,http,sql}`.
Bug fixes passam a ter 1 fonte.

**Fase 3 — Adapters finos.** `os-connectors`/`os-triggers`/`os-notifications`/`os-oauth` leem da
definição única (injetam egress/audit/vault/auto-registro). Remover catálogo espelhado.

**Fase 4 — Largura (Ondas 1→3).** Cada serviço novo: uma pasta no pacote → aparece no AKOS via
adapters + vira listing no marketplace. Priorizar por valor.

---

## 7. Manutenção e à prova de futuro (garantias)

1. **Fonte única + adapters finos** — bug/melhoria em 1 lugar; camadas projetam, não reimplementam.
2. **Template de serviço** — `services/_template/` + gerador `pnpm gen:integration <name>` →
   estrutura idêntica sempre. Adicionar = preencher, não descobrir 5 lugares.
3. **Contract tests por serviço** — golden payloads de webhook + schema de action validados em CI.
   APIs externas quebram; teste de contrato pega cedo.
4. **Contract freeze** — `check:rfc-*` no contrato `Integration` (padrão `os` RFC-0007). Mudança
   de superfície = intencional + `api:update`.
5. **Boundary lint** — `@agentskit/integrations` **nunca** importa `agentskit-os` (proibir ciclo).
6. **Versão independente futura** — se catálogo crescer, versionar por serviço (à la Activepieces).
7. **Zero-dep por serviço** — manter padrão `httpJson`/`node:crypto`; SDKs externos só como
   `optionalDependencies` quando inevitável (tree-shaking + `sideEffects:false`).

---

## 8. Tradeoffs e riscos

**Ganhos:** fim da duplicação AKOS↔lib; adicionar integração de 5 pacotes → 1 pasta; AKOS ganha
largura barato; comunidade mantém conectores (passivo sai do AKOS); 1 contrato em vez de 4 shapes.

**Custos / riscos:**
| Risco | Sev | Mitigação |
|---|---|---|
| Reconciliar 4 shapes (lib JSON Schema, AKOS runtime-tool, connector, trigger Zod) | Alta | tradução one-time; JSON Schema + ZodLike; contract tests |
| Inversão de dep: AKOS (privado) → pacote público | Média | direção saudável; lint proíbe ciclo reverso |
| Apagar `os-runtime/tools` quebra fluxos atuais | Média | mapear 1:1 antes de apagar; testes de paridade |
| Passivo de manutenção ~30+ APIs | Média | Ondas, qualidade>cobertura (`feedback_foundation_over_speed`), contract tests |
| Cópia acidental Activepieces | Média | política "mapa não código", review de PR |
| Boundary free/pago mal traçado | Média | catálogo+auth+trigger livres; vault/egress/audit/marketplace fechados (open-core) |

---

## 9. Boundary free vs proprietário (open-core)

| Componente | Recomendação | Razão |
|---|---|---|
| Catálogo de actions (httpJson) | **FREE** | commodity, adoção |
| Trigger normalize/verify | **FREE** | gancho de adoção; sem isso agente externo é cego |
| OAuth2 runner + token-store *interface* | **FREE** | padrão |
| Connection store multi-tenant + vault/sealer | **AKOS** | enterprise |
| Egress guard, audit assinado, idempotência distribuída | **AKOS** | diferencial |
| Marketplace (listing, billing, publish, payouts) | **AKOS** | monetização |

Dá de graça o que cansa manter (catálogo); cobra pela orquestração/segurança/marketplace.

---

## 10. Dúvidas abertas (preciso de você)

1. **Apagar `os-runtime-agentskit/src/tools/*` duplicados** e depender de `@agentskit/integrations`?
   (recomendo sim — é o maior ganho)
2. **Boundary free/pago (§9)** — confirma a linha? Triggers/oauth ficam livres?
3. **Schema (§4.4)** — JSON Schema + ZodLike (recomendado) ou Zod 1:1 com o AKOS?
4. **Escopo de lançamento** — Fase 0–2 (parar duplicação + mover 40) primeiro, Ondas depois?
   (recomendo)
5. **RAG connectors** (`os-rag-adapters`: drive/dropbox/gcs/notion/onedrive) — ficam no rag ou
   entram no catálogo como categoria "knowledge sources"?
6. **MCP split** (`@agentskit/mcp`) — junto neste RFC ou separado?
```
