---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/mcp"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e de variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/mcp/package.json", "packages/mcp/src/index.ts", "packages/mcp/src/cli.ts", "packages/mcp/README.md", "apps/docs-next/content/docs/for-agents/mcp.mdx", "AGENTS.md", "packages/mcp/CONVENTIONS.md", "packages/mcp/tests/cli.test.ts", "packages/mcp/tests/coding-agent-hosts.test.ts", "packages/mcp/tests/package-manifest.test.ts", "packages/mcp/tests/registry-fetch.test.ts", "packages/mcp/tests/server.test.ts", "packages/mcp/tests/validation.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0028-mcp-beta-boundaries.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-mcp

> [!tldr] Em linguagem comum
> Deixa as ferramentas e os agentes do AgentsKit serem usados por hosts compatíveis com MCP, como Claude Code, Codex e Cursor, pela entrada padrão e saída padrão do processo. Também traz um comando `agentskit-mcp` e leitura de registro de agentes.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/mcp` é uma ponte: expõe ferramentas do AgentsKit como servidor MCP, por padrão sobre stdio (`packages/mcp/src/index.ts:45-48`). Ele não reimplementa o protocolo; encapsula `createMcpServer` e `createStdioTransport` de `@agentskit/tools/mcp` (`packages/mcp/CONVENTIONS.md:6-7`). A implementação cobre o subconjunto de ferramentas do MCP; HTTP, WebSocket, recursos, prompts, controle de acesso e limite de taxa ficam com o host (`CONVENTIONS.md:16-18`). O pacote é beta (`packages/mcp/package.json:71-74`, ADR 0028).

## API e contratos

Exports de `packages/mcp/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentsKitMcpServerOptions` | interface | Opções: `tools`, `authorizeToolCall` (sem ele, a chamada é negada), `serverInfo`, `onEvent`, `transport` | `src/index.ts:14-27` |
| `processStdio` | função | Adapta o processo atual ao transporte stdio (entrada JSON-RPC pelo stdin, saída pelo stdout) | `src/index.ts:33` |
| `createAgentsKitMcpServer` | função | Cria o servidor MCP a partir das ferramentas | `src/index.ts:49` |
| `createAgentTool`, `createTypedAgentTool` (+ `AgentToolConfig`, `TypedAgentToolConfig`) | funções e tipos | Transformar um agente em ferramenta MCP | `src/index.ts:119` |
| `fetchAgent`, `fetchAgentSkill` (+ `FetchedAgent`, `FetchedAgentSkill`, `FetchedTypedAgent`, `FetchAgentSkillOptions`) | funções e tipos | Ler agente e skill de um registro remoto, com limites de tempo e de bytes | `src/index.ts:120-127` (`src/registry-fetch.ts`) |
| `McpServer`, `McpTransport` | tipos | Reexportados de `@agentskit/tools/mcp` | `src/index.ts:128` |

Exemplo real (README do pacote, `packages/mcp/README.md:96-99`):

```ts
import { createAgentsKitMcpServer } from '@agentskit/mcp'

createAgentsKitMcpServer({ tools: [fetchUrl()] }) // stdio by default
```

Comando de linha de comando: `agentskit-mcp` aponta para `./dist/bin.js` (`packages/mcp/package.json:25-27`); a lógica está em `packages/mcp/src/cli.ts`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-net]], [[agentskit-runtime]] e [[agentskit-tools]] (`packages/mcp/package.json:46-52`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/mcp.mdx` (`.doc-bridge/index.json`, `handoffs.mcp`) |
| Consumidores dentro do repo | Nenhum manifesto de pacote ou app declara `@agentskit/mcp` (busca em `packages` e `apps`, commit `9f8d8551`). Aparece na documentação. |
| Consumidores fora do repo | Hosts MCP (Claude Code, Codex, Cursor) iniciam o processo; não é uma dependência de pacote. |

## Dados e efeitos

- Stdio: `stdout` é o canal JSON-RPC. Logs e diagnósticos vão para `stderr` (`packages/mcp/CONVENTIONS.md:8-9`; `src/index.ts:20`, que pede o mesmo para `onEvent`).
- Registro remoto: leitura com tempo limite e limite de bytes, e o conteúdo é só dado, nunca executado (`CONVENTIONS.md:12-13`).
- Credenciais na CLI: a chave é lida do ambiente pelo nome `<PROVIDER>_API_KEY`, montado a partir do provedor escolhido (`packages/mcp/src/cli.ts:180`). O ambiente vem de `process.env` por padrão (`packages/mcp/src/cli.ts:213`).
- Flags da CLI: ausentes, duplicadas ou sem valor fazem a análise falhar (`CONVENTIONS.md:14`). Shell, arquivo e SQLite só entram por opção explícita (`CONVENTIONS.md:15`).

## Como mexer (para agentes)

- **Comece por:** `packages/mcp/src/index.ts` (superfície pública), `packages/mcp/src/cli.ts` (linha de comando) e `packages/mcp/CONVENTIONS.md` (regras).
- **Raiz de edição do handoff:** `packages/mcp` (`.doc-bridge/index.json`, `handoffs.mcp`).
- **Invariantes** (`packages/mcp/CONVENTIONS.md:8-20`):
  - `stdout` é só para o protocolo; logs vão para `stderr`.
  - Nome de ferramenta: 1 a 128 caracteres ASCII (letras, dígitos, `_`, `-`, `.`), único dentro de um servidor (`CONVENTIONS.md:10-11`).
  - Ferramenta que exige confirmação e não tem `authorizeToolCall` é negada (`src/index.ts:17`).
  - Nenhum `throw` puro; erros saem por `onEvent` ou por saída do processo (`CONVENTIONS.md:19`).
  - Cobertura mínima de 95% fora do ponto de entrada (`CONVENTIONS.md:20`).
- **Testes:** `packages/mcp/tests/` (`cli.test.ts`, `coding-agent-hosts.test.ts`, `package-manifest.test.ts`, `registry-fetch.test.ts`, `server.test.ts`, `validation.test.ts`). Os testes de ferramenta MCP em si ficam em `packages/tools/tests/mcp*.test.ts`.
- **Validação do pacote:** `pnpm --filter @agentskit/mcp test` (`packages/mcp/package.json:40`, `vitest run`) e `pnpm --filter @agentskit/mcp lint` (`:43`, `tsc --noEmit`). Há também `smoke:published` (`:42`), que roda `fixtures/run-published-coding-agent-hosts.mjs`. Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** escrever log em `stdout`; criar lógica de protocolo MCP aqui (deve ir para `tools`); registrar ferramenta de confirmação sem `authorizeToolCall`.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0005 - Contrato de skill]] (leitura de skill, `fetchAgentSkill`), [[agentskit ADR-0028 - Limites da ponte MCP beta]] e [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]].

Histórico recente (`git log --oneline -15 -- packages/mcp`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `a4f3c023 feat(mcp): preserve tool metadata and expose confirmation hook (#1832)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `b28266f9 fix(mcp): reuse net bounded registry reads (#1702)`

> [!info]- Detalhe técnico
> - `packages/mcp/package.json:1` — manifesto, `bin`, dependências e scripts.
> - `packages/mcp/src/index.ts:1` — entrada pública.
> - `packages/mcp/src/cli.ts:180` — montagem do nome da variável de chave; `:213` — leitura do ambiente.
> - `apps/docs-next/content/docs/for-agents/mcp.mdx:1` — handoff documental de agentes.
> - `packages/mcp/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
