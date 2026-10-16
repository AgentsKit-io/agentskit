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
  - "apps/example-dspy/package.json"
  - "apps/example-dspy/src/agent.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-dspy

> [!tldr] Em linguagem comum
> Compara variantes locais de prompt por resultados de avaliação sintéticos.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Compara variantes locais de prompt por resultados de avaliação sintéticos. [apps/example-dspy/src/agent.ts:79].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `makeAgent` — (variant: PromptVariant) => agente demonstrativo [apps/example-dspy/src/agent.ts:79]. Exemplo real: `makeAgent('baseline')` [apps/example-dspy/src/agent.ts:79].

## Quem usa e do que depende

Exercita [[agentskit-eval]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-dspy/package.json:1`.

## Dados e efeitos

Lê prompts e dataset versionados; upload é bloqueado pelo stub local.

## Como mexer (para agentes)

- Entrada: `apps/example-dspy/src/agent.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-dspy lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-dspy dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-dspy/package.json`.
- Armadilha: Não implementa otimização de prompt por serviço DSPy remoto.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-dspy): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-14 · 85710388 · consolida superfície de pacotes; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-dspy/package.json:1`; implementação: `apps/example-dspy/src/agent.ts:79`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.

> [!bug] Existe, mas ninguém usa
> O exemplo não conecta serviço de orquestração/otimização real; as respostas são simuladas.
