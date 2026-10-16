---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/adapters"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/adapters/package.json", "packages/adapters/src/index.ts", "packages/adapters/src/cli/manifests.ts", "packages/adapters/src/cli/process.ts", "packages/adapters/README.md", "packages/adapters/fixtures/readme-quickstart.ts", "apps/docs-next/content/docs/for-agents/adapters.mdx", "AGENTS.md", "packages/adapters/CONVENTIONS.md", "packages/adapters/tests/catalog/dispatch.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0031-cli-adapter-execution-boundary.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-adapters

> [!tldr] Em linguagem comum
> Liga o AgentsKit aos provedores de modelo (OpenAI, Anthropic, Gemini, Ollama, Bedrock e outros) e aos de embedding. Cada provedor vira uma função que devolve um adaptador com o mesmo contrato, então trocar de modelo não muda o resto do agente.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/adapters` traduz um provedor de modelo para os contratos estáveis do AgentsKit: adaptadores de chat (`AdapterFactory`, ADR 0001) e embedders (`EmbedFn`, ADR 0003) (`packages/adapters/CONVENTIONS.md:5-8`). Não tem UI nem orquestração de agente; retentativas de transporte e cancelamento ficam aqui, mas laço de agente e política de ferramenta não (`CONVENTIONS.md:9-14`). A pasta `src/cli` adapta CLIs de desenvolvedor externos; a fronteira está na ADR 0031 e, segundo `CONVENTIONS.md:10-12`, `restricted-environment` não é isolamento de SO nem de sistema de arquivos.

## API e contratos

Exports de `packages/adapters/src/index.ts` (linhas verificadas no commit `9f8d8551`). Cada provedor exporta uma função-fábrica, com o alias `*Adapter` quando há nome alternativo:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAdapter`, `generic` | funções | Fábrica genérica e adaptador genérico | `src/index.ts:1-2` |
| `anthropic`, `openai`, `gemini`, `grok`, `ollama`, `deepseek`, `kimi` | funções | Adaptadores de chat por provedor | `src/index.ts:3-9` |
| `langchain`, `langgraph` | funções | Adaptadores para LangChain e LangGraph | `src/index.ts:10` |
| `vercelAI`, `mistral`, `together`, `fireworks`, `openrouter`, `huggingface`, `lmstudio`, `vllm`, `llamacpp` | funções | Adaptadores por provedor ou servidor local | `src/index.ts:11`, `:12`, `:14`, `:16-21` |
| `cohere`, `cohereAdapter`; `groq`, `groqAdapter`; `cerebras`, `cerebrasAdapter` | funções | Adaptadores por provedor, com alias | `src/index.ts:13`, `:15`, `:22` |
| `azureOpenAI`, `azureOpenAIAdapter`; `replicate`, `replicateAdapter` | funções | Azure OpenAI e Replicate | `src/index.ts:23-24` |
| `bail`, `bailAdapter`, `qwen`; `vertex`, `vertexAdapter`; `bedrock`, `bedrockAdapter`; `webllm`, `webllmAdapter` | funções | Provedores com SDK ou runtime próprio (Bedrock e WebLLM têm peer dependencies opcionais) | `src/index.ts:25-28` |
| `openaiCompatible`; `cloudflareAiGateway`, `workersAi` | funções | Transporte compatível com OpenAI e gateways da Cloudflare | `src/index.ts:128`, `:131` |
| `openRouter` | função | Alias de `openrouter`, mantido por compatibilidade | `src/index.ts:130` |
| `fetchWithRetry`, `simulateStream`, `chunkText` (`RetryOptions`) | funções | Utilitários de transporte e streaming | `src/index.ts:58-59` |
| `createRouter` (`RouterCandidate`, `RouterOptions`, `RouterPolicy`) | função e tipos | Escolha de provedor por política | `src/index.ts:61-63` |
| `applyCarbonTable`, `estimateCO2Grams`, `DEFAULT_CARBON_TABLE` (+ tipos) | funções e constante | Estimativa de CO₂ por região | `src/index.ts:65-66` |
| `createEnsembleAdapter` (+ tipos); `createFallbackAdapter` (+ tipos) | funções e tipos | Composição de vários adaptadores: ensemble e fallback | `src/index.ts:68-76` |
| `mockAdapter`, `recordingAdapter`, `replayAdapter`, `inMemorySink` (+ tipos) | funções | Adaptadores de teste: simulado, gravação e reprodução | `src/index.ts:78-85` |
| `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `createOpenAICompatibleEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder` (+ tipos) | funções | Embedders (`EmbedFn`) | `src/index.ts:87-104` |
| `resolveModel`, `withDeprecationPolicy`, `DEFAULT_DEPRECATION_TABLE` (+ tipos) | funções e constante | Resolução de modelo depreciado | `src/index.ts:106-117` |
| `refreshCredentials`, `createRotatingCredentials` (+ tipos) | funções e tipos | Rotação de credenciais | `src/index.ts:119-126` |
| `CapabilityUnsupportedError` | classe | Erro quando o provedor não suporta a capacidade pedida | `src/index.ts:133` |

Subpaths publicados (`packages/adapters/package.json:39-58`): `./createAdapter`, `./catalog`, `./cli`, `./langchain-bridge`.

Exemplo real (README do pacote, `packages/adapters/README.md:79`; mesmo import em `packages/adapters/fixtures/readme-quickstart.ts:1`):

```ts
import { anthropic } from '@agentskit/adapters'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]], [[agentskit-cross-platform]] e [[agentskit-net]] (`packages/adapters/package.json:71-73`) |
| Dependências de desenvolvimento | `@agentskit/tools` (`:76`), `@langchain/core`, `langchain`, `msw` |
| Peer dependencies opcionais | `@aws-sdk/client-bedrock-runtime`, `@mlc-ai/web-llm`, `@langchain/core` (`:86-101`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/adapters.mdx` (`.doc-bridge/index.json`, `handoffs.adapters`) |
| Consumidores dentro do repo | 10 manifestos declaram `@agentskit/adapters` (busca em `packages` e `apps`, commit `9f8d8551`): `apps/ask-backend`, `apps/docs-next`, `apps/example-edge`, `apps/example-embedded` (inclui `raycast`), `apps/example-rag-chat`, `apps/example-react`, `apps/example-webllm`, `packages/cli`, `packages/mcp`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Rede: as chamadas aos provedores são feitas pelo transporte do adaptador, com retentativas do `@agentskit/net`. O adaptador só monta a requisição em `createSource` e faz I/O em `stream()` (`CONVENTIONS.md:20`).
- Variáveis de ambiente: o código do pacote não lê chaves de API diretamente. O catálogo de CLIs declara nomes de variáveis de credencial (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY`) em `packages/adapters/src/cli/manifests.ts:102`, `:118`, `:134`; os valores são passados pelo host.
- Processo: `packages/adapters/src/cli/process.ts:79-111` lê `process.env` e, na ausência de lista explícita, repassa o ambiente inteiro ao processo filho. Quem chama deve restringir o ambiente; esse é o limite que a documentação de CLI declara (`CONVENTIONS.md:10-12`).
- Catálogo de modelos: `catalog/snapshot.json` contém dados de provedores (preços e nomes de variáveis); `dispatch.ts` não lê `process.env` e recebe placeholders por parâmetro (`packages/adapters/src/catalog/dispatch.ts:15`).

## Como mexer (para agentes)

- **Comece por:** `packages/adapters/src/index.ts` (superfície pública), `packages/adapters/src/createAdapter.ts` (fábrica) e `packages/adapters/CONVENTIONS.md` (regras e receita para adicionar provedor).
- **Raiz de edição do handoff:** `packages/adapters` (`.doc-bridge/index.json`, `handoffs.adapters`).
- **Invariantes** (`packages/adapters/CONVENTIONS.md:16-24`, `:66`; A1–A10 são o contrato do adaptador):
  - A1: `createSource` monta a requisição sem fazer I/O; o I/O fica em `stream()`.
  - Termina com exatamente um chunk `done` ou `error`; abort cancela o transporte e gera o erro terminal (A3, A6, A9).
  - Argumentos de ferramenta chegam completos em um chunk só (A5).
  - Dados específicos do provedor vão em `chunk.metadata`, que o consumidor não deve depender (A8).
  - Embedders são determinísticos: mesmo texto e modelo, mesmo vetor (E1, `CONVENTIONS.md:32`).
  - Nenhum tipo de SDK do provedor vaza para a API pública (`CONVENTIONS.md:62`).
  - Bundle abaixo de 20 KB gzip (`CONVENTIONS.md:67`).
- **Testes:** `packages/adapters/tests/` (inclui `catalog/`, com `dispatch`, `drift`, `loader`, `overrides`, `pricing`, `snapshot`, `capability-matrix`). Os testes por provedor seguem o padrão de `CONVENTIONS.md:44-50`.
- **Validação do pacote:** `pnpm --filter @agentskit/adapters test` (`packages/adapters/package.json:65`, roda build do turbo e `vitest run`) e `pnpm --filter @agentskit/adapters lint` (`:67`, `tsc --noEmit` e `tsc --noEmit -p tsconfig.tests.json`). Cobertura: 90% de linhas (`CONVENTIONS.md:68`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:56-62`): chamar `fetch` em `createSource`; mutar `messages` de entrada; lançar exceção de `stream()` em erro do provedor (emitir chunk `error`); enviar argumentos de ferramenta em vários chunks.

> [!question] Dúvida: contrato compartilhado de adaptadores
> `CONVENTIONS.md:46` manda usar a suíte `tests/adapter-contract.test.ts`, mas o arquivo não existe em `packages/adapters/tests` neste commit. Confirmar se a suíte mudou de lugar ou se a regra está desatualizada.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0001 - Contrato de adapter]] (contrato de chat), [[agentskit ADR-0003 - Contrato de memória]] (embedders, citado em `CONVENTIONS.md:8`), [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] e [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]].

Histórico recente (`git log --oneline -15 -- packages/adapters`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `bbd4d974 feat(adapters): free OpenAI-compatible transport and image/file parts (#1826)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `d949bcf1 fix(adapters): reuse core secret redaction (#1770)`

> [!info]- Detalhe técnico
> - `packages/adapters/package.json:1` — manifesto, versão, dependências, peer dependencies e scripts.
> - `packages/adapters/src/index.ts:1` — entrada pública.
> - `packages/adapters/src/cli/process.ts:79` — leitura do ambiente para processos filhos.
> - `apps/docs-next/content/docs/for-agents/adapters.mdx:1` — handoff documental de agentes.
> - `packages/adapters/CONVENTIONS.md:1` — invariantes e orientação de contribuição.

> [!bug] Existe, mas ninguém usa
> `refreshCredentials` e `createRotatingCredentials` (`packages/adapters/src/credential-rotation.ts`) aparecem só no código e nos testes do próprio pacote e na documentação (busca em `packages` e `apps`, commit `9f8d8551`). Nenhum manifesto ou app do repositório os consome. Os embedders, ao contrário, são usados por `packages/cli`, `packages/memory`, `packages/rag` e `packages/templates`.
