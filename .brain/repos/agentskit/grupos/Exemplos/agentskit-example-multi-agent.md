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
  - "apps/example-multi-agent/package.json"
  - "apps/example-multi-agent/src/App.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-multi-agent

> [!tldr] Em linguagem comum
> Mostra visualmente planejamento/delegação como roteiro de UI.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Mostra visualmente planejamento/delegação como roteiro de UI. [apps/example-multi-agent/src/App.tsx:70].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `App` — componente React [apps/example-multi-agent/src/App.tsx:70]. Exemplo real: `<App />` [apps/example-multi-agent/src/App.tsx:70].

## Quem usa e do que depende

Exercita [[agentskit-react]], [[agentskit-skills]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-multi-agent/package.json:1`.

## Dados e efeitos

Estado em memória do navegador; adapter devolve respostas simuladas.

## Como mexer (para agentes)

- Entrada: `apps/example-multi-agent/src/App.tsx`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-multi-agent lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-multi-agent dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-multi-agent/package.json`.
- Armadilha: Não comprova orquestração multiagente real.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-multi-agent): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências; 2026-06-09 · 230dd913 · atualiza dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-multi-agent/package.json:1`; implementação: `apps/example-multi-agent/src/App.tsx:70`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.

> [!bug] Existe, mas ninguém usa
> O exemplo não conecta serviço de orquestração/otimização real; as respostas são simuladas.
