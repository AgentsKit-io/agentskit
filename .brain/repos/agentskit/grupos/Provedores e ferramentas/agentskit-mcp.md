---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/mcp"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/mcp/package.json", "packages/mcp/src/index.ts", "apps/docs-next/content/docs/for-agents/mcp.mdx", "AGENTS.md", "packages/mcp/CONVENTIONS.md", "packages/mcp/tests/cli.test.ts", "packages/mcp/tests/coding-agent-hosts.test.ts", "packages/mcp/tests/package-manifest.test.ts", "packages/mcp/tests/registry-fetch.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0028-mcp-beta-boundaries.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-mcp

> [!tldr] Em linguagem comum
> Pacote mcp do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/mcp` publica a superfície definida em `packages/mcp/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/mcp.mdx` e limita edições a `packages/mcp`. Fonte: `packages/mcp/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.mcp`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentsKitMcpServerOptions {` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:14` |
| `processStdio` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:33` |
| `createAgentsKitMcpServer` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:49` |
| `createAgentTool` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:119` |
| `createTypedAgentTool` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:119` |
| `type AgentToolConfig` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:119` |
| `type TypedAgentToolConfig` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:119` |
| `McpServer` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:128` |
| `McpTransport` | export nomeado | API pública do pacote. | `packages/mcp/src/index.ts:128` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createAgentsKitMcpServer } from '@agentskit/mcp'` — `packages/mcp/README.md:96`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-net]], [[agentskit-runtime]], [[agentskit-tools]] (`packages/mcp/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/mcp.mdx` (`.doc-bridge/index.json`, `handoffs.mcp`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/mcp.mdx`, `packages/mcp/CONVENTIONS.md` e `packages/mcp/src/index.ts`.
- **Raiz de edição do handoff:** `packages/mcp` (`.doc-bridge/index.json`, `handoffs.mcp`).
- **Invariantes:** digits, `_`, `-`, or `.`, and must be unique within one server. (`packages/mcp/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/mcp/tests/cli.test.ts`, `packages/mcp/tests/coding-agent-hosts.test.ts`, `packages/mcp/tests/package-manifest.test.ts`, `packages/mcp/tests/registry-fetch.test.ts`, `packages/mcp/tests/server.test.ts`, `packages/mcp/tests/validation.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/mcp test` e `pnpm --filter @agentskit/mcp lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]]. Histórico recente (`git log --oneline -15 -- packages/mcp`):

- `e8d42064 chore: version packages (#1757)`
- `a4f3c023 feat(mcp): preserve tool metadata and expose confirmation hook (#1832)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `b28266f9 fix(mcp): reuse net bounded registry reads (#1702)`

> [!info]- Detalhe técnico
> - `packages/mcp/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/mcp/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/mcp.mdx:1` — handoff documental de agentes.
> - `packages/mcp/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
