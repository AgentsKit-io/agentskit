---
tipo: pacote
repo: agentskit
grupo: Ferramentas de desenvolvimento
npm: "@agentskit/cli"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/cli/package.json", "packages/cli/src/index.ts", "apps/docs-next/content/docs/for-agents/cli.mdx", "AGENTS.md", "packages/cli/CONVENTIONS.md", "packages/cli/tests/ai.test.ts", "packages/cli/tests/chat-app-utils.test.ts", "packages/cli/tests/chat-app.test.tsx", "packages/cli/tests/commands-actions.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/ferramentas-de-desenvolvimento]
---

# agentskit-cli

> [!tldr] Em linguagem comum
> Pacote cli do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Ferramentas de desenvolvimento]]

## O que faz e por que existe

O pacote `@agentskit/cli` publica a superfície definida em `packages/cli/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/cli.mdx` e limita edições a `packages/cli`. Fonte: `packages/cli/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.cli`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createCli` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:1` |
| `loadConfig` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:2` |
| `AgentsKitConfig` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:3` |
| `LoadConfigOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:3` |
| `ChatApp` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:4` |
| `renderChatHeader` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:4` |
| `writeStarterProject` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:5` |
| `resolveChatProvider` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:6` |
| `ChatCommandOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:7` |
| `InitCommandOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:8` |
| `StarterKind` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:8` |
| `ChatProviderOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:9` |
| `ResolvedChatProvider` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:9` |
| `runAgent` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:10` |
| `RunCommandOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:11` |
| `runDoctor` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:12` |
| `renderReport` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:12` |
| `CheckResult` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:13` |
| `CheckStatus` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:13` |
| `DoctorOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:13` |
| `DoctorReport` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:13` |
| `startDev` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:14` |
| `DevOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:15` |
| `DevController` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:15` |
| `DevWatcher` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:15` |
| `startTunnel` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:16` |
| `TunnelOptions` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:17` |
| `TunnelController` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:17` |
| `TunnelLike` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:17` |
| `{` | export nomeado | API pública do pacote. | `packages/cli/src/index.ts:30` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import '@agentskit/cli'` — `packages/cli/tests/fixtures/readme-quickstart.ts:1`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-ink]], [[agentskit-integrations]], [[agentskit-memory]], [[agentskit-net]], [[agentskit-rag]], [[agentskit-runtime]], [[agentskit-skills]], [[agentskit-tools]] (`packages/cli/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/cli.mdx` (`.doc-bridge/index.json`, `handoffs.cli`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, GITHUB_TOKEN, GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, HOME, KIMI_API_KEY, MOONSHOT_API_KEY, MY_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, PORT, SLACK_BOT_TOKEN, USERPROFILE, VITE_, XAI_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/cli.mdx`, `packages/cli/CONVENTIONS.md` e `packages/cli/src/index.ts`.
- **Raiz de edição do handoff:** `packages/cli` (`.doc-bridge/index.json`, `handoffs.cli`).
- **Invariantes:** Siga os limites de responsabilidade e compatibilidade descritos em CONVENTIONS.md. (`packages/cli/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/cli/tests/ai.test.ts`, `packages/cli/tests/chat-app-utils.test.ts`, `packages/cli/tests/chat-app.test.tsx`, `packages/cli/tests/commands-actions.test.ts`, `packages/cli/tests/commands-chat-resume.test.ts`, `packages/cli/tests/commands-chat.test.ts`, `packages/cli/tests/commands-misc.test.ts`, `packages/cli/tests/commands-registry.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/cli test` e `pnpm --filter @agentskit/cli lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0034 - Shell do ecossistema v1]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]]. Histórico recente (`git log --oneline -15 -- packages/cli`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `3eabaf7f feat(cross-platform): add shared testing helpers (#1777)`
- `d6da728f fix(cli): bound network response bodies (#1758)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`

> [!info]- Detalhe técnico
> - `packages/cli/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/cli/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/cli.mdx:1` — handoff documental de agentes.
> - `packages/cli/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
