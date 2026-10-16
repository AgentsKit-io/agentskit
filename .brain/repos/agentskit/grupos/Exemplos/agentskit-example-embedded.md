---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; pnpm indisponível, comandos não executados; auditado em 2026-10-16"
fontes:
  - "apps/example-embedded/package.json"
  - "apps/example-embedded/README.md"
  - "apps/example-embedded/src/index.ts"
  - "apps/example-embedded/vscode/tasks.json"
  - "apps/example-embedded/raycast/agentskit-ask.js"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-embedded

> [!tldr] Em linguagem comum
> O mesmo agente rodando em três hosts: linha de comando Node, Raycast (Script Command) e tarefa do VS Code. Mostra que só muda a forma de chamar o runtime.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Mostra o mesmo agente em três hosts (`apps/example-embedded/README.md:3-10`):

| Host | Arquivo | Como usar |
|---|---|---|
| CLI Node | `src/index.ts` | `pnpm --filter @agentskit/example-embedded dev "..."` (`README.md:8`) |
| Raycast Script Command | `raycast/agentskit-ask.js` | Copiar o script e o `raycast/package.json` para a pasta de scripts do Raycast (`README.md:9`) |
| Tarefa do VS Code | `vscode/tasks.json` | Copiar para `.vscode/tasks.json` (`README.md:10`) |

O runtime é criado em `apps/example-embedded/src/index.ts:56`, e o provedor OpenAI é montado em `:46`. O pacote é privado (`apps/example-embedded/package.json:2`). O host Raycast é descrito em [[agentskit-example-embedded-raycast]].

## API e contratos

Não exporta API npm. Símbolo principal: a função que monta o runtime em `apps/example-embedded/src/index.ts:56`.

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/adapters`, `@agentskit/core` e `@agentskit/runtime` (`apps/example-embedded/package.json:13-15`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `OPENAI_API_KEY` (`apps/example-embedded/src/index.ts:33`) escolhe o adapter real.
- `OPENAI_MODEL` define o modelo, com padrão `gpt-4o-mini` (`apps/example-embedded/src/index.ts:46`).
- Rede: chamadas ao provedor OpenAI quando a chave está definida.

## Como mexer (para agentes)

- **Comece por:** `apps/example-embedded/src/index.ts` (CLI) e os arquivos de host em `raycast/` e `vscode/`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-embedded lint` (`tsc --noEmit`, `apps/example-embedded/package.json:10`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `tsx src/index.ts` (`apps/example-embedded/package.json:7`).
- **Armadilha:** não embutir chaves em arquivos de host nem em distribuições; use variáveis de ambiente do host.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-embedded`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `5cb1c6df feat(docs): instrument ecosystem activation and harden public surfaces (#1476)`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`.

> [!info]- Detalhe técnico
> - `apps/example-embedded/package.json:1` — manifesto, scripts (`:7` dev, `:9` build, `:10` lint) e dependências (`:13-15`).
> - `apps/example-embedded/src/index.ts:33` — `OPENAI_API_KEY`; `:46` — `OPENAI_MODEL` e `openai(...)`; `:56` — `createRuntime`.
> - `apps/example-embedded/README.md:6-10` — tabela de hosts.
