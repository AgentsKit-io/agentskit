---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/integrations"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e de variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/integrations/package.json", "packages/integrations/src/index.ts", "packages/integrations/src/project/integration-tools.ts", "packages/integrations/src/services/slack/auth.ts", "packages/integrations/README.md", "apps/docs-next/content/docs/for-agents/integrations.mdx", "AGENTS.md", "packages/integrations/CONVENTIONS.md", "packages/integrations/tests/integration-tools.test.ts", "packages/integrations/tests/http.test.ts", "packages/integrations/tests/transport-contract.test.ts", "docs/architecture/adrs/0012-vendor-adapter-scope.md", "docs/architecture/adrs/0026-integration-execution-boundaries.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-integrations

> [!tldr] Em linguagem comum
> Catálogo de serviços externos (Slack, e-mail, comércio, produtividade e outros, cerca de 50 no total). Cada serviço é descrito uma vez e vira ferramentas para o agente, conectores de envio, gatilhos de entrada e especificação de autenticação. Está em beta.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/integrations` guarda um descritor por serviço (`Integration`) e o projeta em ferramentas do agente, conectores, gatilhos e especificações OAuth (`packages/integrations/src/index.ts:1-4`). O catálogo usa só `fetch` e `node:crypto`, sem SDK de fornecedor (ADR 0012, `packages/integrations/CONVENTIONS.md:3-6`). A fronteira de execução (ADR 0026) exige HTTP ligado à autenticação e confinado à origem, e confirmação derivada para ações `write`, `external` e `destructive` (`CONVENTIONS.md:23-26`).

## API e contratos

Exports de `packages/integrations/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `Integration`, `IntegrationAction`, `IntegrationActionContext`, `IntegrationTrigger`, `AuthSpec`, `OAuth2AuthSpec`, `OAuth2ProviderSpec`, `ApiKeyAuthSpec`, `WebhookSecretAuthSpec`, `NoAuthSpec`, `ConfigField`, `SideEffect`, `WebhookInput`, `VerifyResult`, `NormalizedEvent`, `ExternalThreadRef` | tipos | Contrato do descritor, da autenticação e dos eventos | `src/index.ts:7-24` |
| `defineIntegration`, `defineAction`, `defineTrigger` | funções | Declarar serviço, ação e gatilho | `src/index.ts:25` |
| `CONFIG_FIELDS` | constante | Campos de configuração padronizados | `src/index.ts:26` |
| `httpJson`, `bindHttp`, `composeTimeoutSignal`, `readResponseText` (+ `HttpToolOptions`, `HttpJsonRequest`, `IntegrationHttp`, `RetryPolicy`, `RetryableHttpMethod`) | funções e tipos | HTTP ligado à autenticação; `bindHttp` desliga redirecionamento automático | `src/index.ts:28-29` |
| `createRegistry`, `registerIntegration`, `getIntegration`, `listIntegrations`, `integrationsByCategory` (+ `IntegrationRegistry`) | funções e tipo | Registro de serviços | `src/index.ts:31-38` |
| `toToolDefinitions`, `actionToToolDefinition`, `httpOptionsFor` (+ `ProjectionConfig`) | funções e tipo | Projeção de descritores em `ToolDefinition` | `src/index.ts:43-48` |
| `integrationTools`, `integrationToolsFromEnv`, `credentialEnvVar` | funções | Ferramentas prontas por serviço, a partir de credenciais | `src/index.ts:49-53` |
| `export * from './services'` | reexportação | Todos os descritores do catálogo; o registro acontece por efeito colateral no import | `src/index.ts:57` |

Subcaminho publicado: `@agentskit/integrations/testing`, com validadores de descritor (`package.json:34-38`; `CONVENTIONS.md:21-22`).

Exemplo real (README do pacote, `packages/integrations/README.md:48`):

```ts
import { integrationTools } from '@agentskit/integrations'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] e [[agentskit-net]] (`packages/integrations/package.json:54-57`) |
| Dependência de projeto | Sem SDK de fornecedor; HTTP e criptografia vêm de `fetch` e `node:crypto` (`CONVENTIONS.md:4-6`). |
| Consumidores dentro do repo | `packages/tools` declara o pacote (`packages/tools/package.json:75`). Os serviços que estavam em `@agentskit/tools` viraram shims `@deprecated` em `packages/tools/src/integrations/*.ts` (ex.: `slack.ts:10`, `gmail.ts:5`, `teams.ts:19`), que importam daqui (`toToolDefinitions`, `<servico>Integration`). Os consumidores diretos de `@agentskit/integrations` não foram listados nesta auditoria. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/integrations.mdx` (`.doc-bridge/index.json`, `handoffs.integrations`) |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Import: o pacote é marcado com `sideEffects: true` (`package.json:24`), porque os serviços se registram no registro padrão ao serem importados (`src/index.ts:55-57`).
- Rede: HTTP pelo cliente ligado à autenticação; URLs controladas pelo modelo passam por `fetchUntrusted`, que falha fechado quando o host não injeta uma política (`CONVENTIONS.md:25`, `:49-50`).
- Variáveis de ambiente: `process.env` aparece só em exemplo de JSDoc (`packages/integrations/src/project/integration-tools.ts:11`). O nome `SLACK_BOT_TOKEN` é a dica de credencial da autenticação do Slack (`packages/integrations/src/services/slack/auth.ts:7`); o código não o lê diretamente nesse ponto.

## Como mexer (para agentes)

- **Comece por:** `packages/integrations/src/contract.ts` (tipos de descritor, referenciado por `src/index.ts:7-25`), `packages/integrations/src/services/` (catálogo) e `packages/integrations/CONVENTIONS.md` (regras).
- **Raiz de edição do handoff:** `packages/integrations` (`.doc-bridge/index.json`, `handoffs.integrations`).
- **Invariantes** (`packages/integrations/CONVENTIONS.md:23-26`, `:52-59`, `:81-89`):
  - Sem SDK de fornecedor; só `fetch` e `node:crypto` (ADR 0012).
  - HTTP ligado à autenticação, confinado à origem, sem redirecionamento automático; credenciais nunca entram nos argumentos da ação.
  - `sideEffect` declarado com honestidade (`none`, `read`, `write`, `destructive`, `external`); a projeção força confirmação para `write`, `external` e `destructive`.
  - URL controlada pelo modelo usa `ctx.fetchUntrusted`, nunca `fetch` cru.
  - Sem `throw new Error` puro; usar erros tipados do pacote.
  - Nada de `stable`: o pacote é beta (`CONVENTIONS.md:6`, `:59`).
- **Testes:** `packages/integrations/tests/` com 24 arquivos, por exemplo `registry.test.ts`, `http.test.ts`, `integration-tools.test.ts`, `transport-contract.test.ts`, `validate.test.ts`, `webhook-triggers.test.ts`, `oauth-specs.test.ts`, `service-response-bodies.test.ts` e `new-services-1` a `-5`.
- **Novo serviço:** `pnpm gen:integration <nome>` (raiz, `package.json:30`) copia `services/_template` (`CONVENTIONS.md:40`).
- **Validação do pacote:** `pnpm --filter @agentskit/integrations test` (`package.json:49`, roda build do turbo e `vitest run`) e `pnpm --filter @agentskit/integrations lint` (`:51`, `tsc --noEmit`). Cobertura de linhas: 80%, sem `src/services/_template/**` (`CONVENTIONS.md:65-66`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:72-79`): importar SDK de fornecedor; pôr credencial na superfície da ação; duplicar ferramenta em `@agentskit/tools`; declarar `sideEffect` de forma imprecisa; usar `fetch` cru para URL do modelo.
- **Quem revisa:** checklist em `CONVENTIONS.md:81-89`.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]] e [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]].

Histórico recente (`git log --oneline -15 -- packages/integrations`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `70dadc49 fix(integrations): reuse core secret redaction (#1771)`
- `9b5d0b7a fix(integrations): bound provider response bodies (#1756)`

> [!info]- Detalhe técnico
> - `packages/integrations/package.json:1` — manifesto, versão, `sideEffects`, dependências, subcaminho `testing` e scripts.
> - `packages/integrations/src/index.ts:1` — entrada pública.
> - `packages/integrations/src/project/integration-tools.ts:11` — exemplo de uso de `integrationTools` com `process.env`.
> - `packages/integrations/src/services/slack/auth.ts:7` — dica de credencial `SLACK_BOT_TOKEN`.
> - `apps/docs-next/content/docs/for-agents/integrations.mdx:1` — handoff documental de agentes.
> - `packages/integrations/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
