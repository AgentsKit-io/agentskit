---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/adapters"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/adapters/package.json", "packages/adapters/src/index.ts", "apps/docs-next/content/docs/for-agents/adapters.mdx", "AGENTS.md", "packages/adapters/CONVENTIONS.md", "packages/adapters/tests/azure-openai.test.ts", "packages/adapters/tests/bail.test.ts", "packages/adapters/tests/bedrock.test.ts", "packages/adapters/tests/capabilities.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0004-retriever-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-adapters

> [!tldr] Em linguagem comum
> Pacote adapters do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/adapters` publica a superfície definida em `packages/adapters/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/adapters.mdx` e limita edições a `packages/adapters`. Fonte: `packages/adapters/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.adapters`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:1` |
| `generic` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:2` |
| `anthropic` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:3` |
| `openai` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:4` |
| `gemini` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:5` |
| `grok` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:6` |
| `ollama` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:7` |
| `deepseek` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:8` |
| `kimi` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:9` |
| `langchain` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:10` |
| `langgraph` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:10` |
| `vercelAI` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:11` |
| `mistral` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:12` |
| `cohere` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:13` |
| `cohereAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:13` |
| `together` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:14` |
| `groq` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:15` |
| `groqAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:15` |
| `fireworks` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:16` |
| `openrouter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:17` |
| `huggingface` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:18` |
| `lmstudio` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:19` |
| `vllm` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:20` |
| `llamacpp` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:21` |
| `cerebras` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:22` |
| `cerebrasAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:22` |
| `azureOpenAI` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:23` |
| `azureOpenAIAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:23` |
| `replicate` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:24` |
| `replicateAdapter` | export nomeado | API pública do pacote. | `packages/adapters/src/index.ts:24` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { anthropic } from '@agentskit/adapters'` — `packages/adapters/README.md:79`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-net]] (`packages/adapters/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/adapters.mdx` (`.doc-bridge/index.json`, `handoffs.adapters`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: ANTHROPIC_API_KEY, CLI_SECRET, HOME, OPENAI_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/adapters.mdx`, `packages/adapters/CONVENTIONS.md` e `packages/adapters/src/index.ts`.
- **Raiz de edição do handoff:** `packages/adapters` (`.doc-bridge/index.json`, `handoffs.adapters`).
- **Invariantes:** developer CLIs; it must remain shell-free, bounded, and explicit about the (`packages/adapters/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/adapters/tests/azure-openai.test.ts`, `packages/adapters/tests/bail.test.ts`, `packages/adapters/tests/bedrock.test.ts`, `packages/adapters/tests/capabilities.test.ts`, `packages/adapters/tests/carbon.test.ts`, `packages/adapters/tests/catalog`, `packages/adapters/tests/cerebras.test.ts`, `packages/adapters/tests/cli-types.test-d.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/adapters test` e `pnpm --filter @agentskit/adapters lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0027 - Limites de segurança do statechart beta]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0035 - Poda da documentação e consolidação das rotas de referência da API]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]]. Histórico recente (`git log --oneline -15 -- packages/adapters`):

- `e8d42064 chore: version packages (#1757)`
- `bbd4d974 feat(adapters): free OpenAI-compatible transport and image/file parts (#1826)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `d949bcf1 fix(adapters): reuse core secret redaction (#1770)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`

## No law-os

Atende as chamadas ao provedor selecionado pelo host, via [[os-runtime-agentskit]]. Inclui redação, reparo e revisão do parecer, além da análise inicial; o modelo efetivo por papel depende da instalação.

| Etapa | O que faz |
|---|---|
| [[law-os - Etapa 2 - Triagem]] · [[law-os - Etapa 3 - Extrair cláusulas]] · [[law-os - Etapa 5 - Analisar riscos]] · [[law-os - Etapa 6 - Redigir parecer]] | Envia o prompt montado pelo [[os-runtime]] ao provedor ativo e devolve a resposta |
| Etapas 1, 4, 7, 8 | **Não atua.** São código ou humano |

| Ramo atual | Papel |
|---|---|
| [[law-os - Etapa 6c - Revisar parecer devolvido]] | Nova execução com parecer-reviser; usa o mesmo caminho de execução/IA e retorna à validação antes da aprovação. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.

> [!info]- Detalhe técnico
> - `packages/adapters/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/adapters/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/adapters.mdx:1` — handoff documental de agentes.
> - `packages/adapters/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
