---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/integrations"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/integrations/package.json", "packages/integrations/src/index.ts", "apps/docs-next/content/docs/for-agents/integrations.mdx", "AGENTS.md", "packages/integrations/CONVENTIONS.md", "packages/integrations/tests/ai-web.test.ts", "packages/integrations/tests/audio.test.ts", "packages/integrations/tests/commerce.test.ts", "packages/integrations/tests/comms-adapters.test.ts", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0012-vendor-adapter-scope.md", "docs/architecture/adrs/0014-trusted-tool-call-proposal.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-integrations

> [!tldr] Em linguagem comum
> Pacote integrations do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/integrations` publica a superfície definida em `packages/integrations/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/integrations.mdx` e limita edições a `packages/integrations`. Fonte: `packages/integrations/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.integrations`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `{` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:7` |
| `defineIntegration` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:25` |
| `defineAction` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:25` |
| `defineTrigger` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:25` |
| `CONFIG_FIELDS` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:26` |
| `HttpToolOptions` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:28` |
| `HttpJsonRequest` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:28` |
| `IntegrationHttp` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:28` |
| `RetryPolicy` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:28` |
| `RetryableHttpMethod` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:28` |
| `httpJson` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:29` |
| `bindHttp` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:29` |
| `composeTimeoutSignal` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:29` |
| `readResponseText` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:29` |
| `IntegrationRegistry` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:31` |
| `ProjectionConfig` | export nomeado | API pública do pacote. | `packages/integrations/src/index.ts:43` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { integrationTools } from '@agentskit/integrations'` — `packages/integrations/README.md:48`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-net]] (`packages/integrations/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/integrations.mdx` (`.doc-bridge/index.json`, `handoffs.integrations`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: SLACK_BOT_TOKEN. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/integrations.mdx`, `packages/integrations/CONVENTIONS.md` e `packages/integrations/src/index.ts`.
- **Raiz de edição do handoff:** `packages/integrations` (`.doc-bridge/index.json`, `handoffs.integrations`).
- **Invariantes:** Siga os limites de responsabilidade e compatibilidade descritos em CONVENTIONS.md. (`packages/integrations/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/integrations/tests/ai-web.test.ts`, `packages/integrations/tests/audio.test.ts`, `packages/integrations/tests/commerce.test.ts`, `packages/integrations/tests/comms-adapters.test.ts`, `packages/integrations/tests/comms.test.ts`, `packages/integrations/tests/config-fields.test.ts`, `packages/integrations/tests/default-registry.test.ts`, `packages/integrations/tests/dev.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/integrations test` e `pnpm --filter @agentskit/integrations lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0035 - Poda da documentação e consolidação das rotas de referência da API]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]]. Histórico recente (`git log --oneline -15 -- packages/integrations`):

- `e8d42064 chore: version packages (#1757)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `70dadc49 fix(integrations): reuse core secret redaction (#1771)`
- `0104d573 test(integrations): stream until cancel in body-limit tests (#1772)`
- `9b5d0b7a fix(integrations): bound provider response bodies (#1756)`
- `0743256f chore: version packages (#1753)`

> [!info]- Detalhe técnico
> - `packages/integrations/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/integrations/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/integrations.mdx:1` — handoff documental de agentes.
> - `packages/integrations/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
