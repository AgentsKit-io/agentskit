---
tipo: guia
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; comandos conferidos em package.json e nos manifests dos exemplos; pnpm não executado; auditado em 2026-10-16"
fontes:
  - "AGENTS.md"
  - "CONTRIBUTING.md"
  - "pnpm-workspace.yaml"
  - "package.json"
  - ".github/workflows/e2e.yml"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Adicionar um exemplo

> [!tldr] Em linguagem comum
> Use para mostrar a composição de pacotes do AgentsKit com um host ou capacidade, num app pequeno em `apps/`.

← [[00 Hub - agentskit]]

## Quando usar

Ao demonstrar a composição de pacotes do AgentsKit com um host (navegador, terminal, bot, edge) ou com uma capacidade (RAG, fluxo, avaliação). Os exemplos atuais estão no grupo [[00 Grupo - agentskit - Exemplos]].

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md:26-27`).
- Checkout atualizado; leia o handoff dos pacotes que o exemplo vai usar.

## Passos

1. Leia `AGENTS.md`, `CONTRIBUTING.md` e os README e CONVENTIONS dos pacotes usados.
2. Crie `apps/example-<slug>` com `package.json` próprio. Os exemplos atuais declaram os pacotes como `"workspace:*"` (por exemplo `apps/example-react/package.json:12-14`), e `pnpm-workspace.yaml` deve incluir a pasta `apps/*`.
3. Escreva um README com o objetivo, os requisitos, o comando `dev`, os nomes das variáveis de ambiente e o limite entre mock e integração real. Os exemplos existentes seguem esse formato (`apps/example-embedded/README.md`).
4. Adicione testes só se o comportamento novo exigir (ver os exemplos com `tests/` em [[agentskit-example-discord-bot]]). Conecte ao E2E só quando for aplicável (`.github/workflows/e2e.yml`).

## Como validar

- `pnpm --filter @agentskit/example-<slug> lint` (`tsc --noEmit`, presente nos exemplos atuais).
- `pnpm --filter @agentskit/example-<slug> build`, quando o script existir.
- `pnpm --filter @agentskit/example-<slug> test`, se houver testes.
- `pnpm test:e2e`: o E2E cobre os exemplos (`CONTRIBUTING.md:220`; script em `package.json:11`).

## Erros comuns

- Não apresente uma simulação como integração real; o README deve dizer o que é mock.
- Não coloque chaves em app cliente nem em documentação. Variáveis `VITE_` e `EXPO_PUBLIC_` vão para o bundle do cliente (ver [[agentskit-example-react]]).

## Notas relacionadas

- [[00 Grupo - agentskit - Exemplos]]
- [[Criar um pacote]]
