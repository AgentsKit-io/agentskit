---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "doc-bridge index versionado em .doc-bridge/index.json (gerado em 2026-10-12) para inventário/relacionamentos; pnpm indisponível, CLI não executada; inspeção estática no commit 9b31c771"
fontes:
  - "apps/example-react/package.json"
  - "apps/example-react/src/App.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-react

> [!tldr] Em linguagem comum
> Demonstra chat React com adapter, ferramenta e memória do navegador.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra chat React com adapter, ferramenta e memória do navegador. [apps/example-react/src/App.tsx:87].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `App` — componente React [apps/example-react/src/App.tsx:87]. Exemplo real: `<App />` [apps/example-react/src/App.tsx:87].

## Quem usa e do que depende

Exercita [[agentskit-react]], [[agentskit-adapters]], [[agentskit-core]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-react/package.json:1`.

## Dados e efeitos

localStorage key `agentskit-example-react`; `VITE_OPENAI_API_KEY` seleciona adapter real; sem chave usa demo.

## Como mexer (para agentes)

- Entrada: `apps/example-react/src/App.tsx`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-react lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-react dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-react/package.json`.
- Armadilha: Variável Vite vai para o cliente; nunca use segredo de servidor.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-react): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências; 2026-06-09 · 230dd913 · atualiza dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-react/package.json:1`; implementação: `apps/example-react/src/App.tsx:87`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
