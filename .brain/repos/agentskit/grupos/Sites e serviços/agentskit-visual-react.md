---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "doc-bridge index versionado em .doc-bridge/index.json (gerado em 2026-10-12) para inventário/relacionamentos; pnpm indisponível, CLI não executada; inspeção estática no commit 9b31c771"
fontes:
  - "apps/visual-react/package.json"
  - "apps/visual-react/src/Harness.tsx"
  - "apps/visual-react/tests/visual.spec.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-visual-react

> [!tldr] Em linguagem comum
> Galeria controlada para inspecionar componentes React em cenários repetíveis e comparar screenshots.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Harness fixa casos/estado e usa stubs para exercitar variantes de UI sem provedor real. [apps/visual-react/src/Harness.tsx:137].

## API e contratos

O workspace é privado e não publica API npm; o contrato observável é a superfície de app abaixo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `Harness` | componente React; `CASE_IDS: string[]` | Composição principal | `apps/visual-react/src/Harness.tsx:137` |

Exemplo real: `<Harness />` — `apps/visual-react/src/Harness.tsx:137`.

## Quem usa e do que depende

Testa [[agentskit-react]]; Playwright navega pela galeria.

| Relação | Evidência |
|---|---|
| Dependências declaradas no manifesto | `apps/visual-react/package.json:1` |

## Dados e efeitos

Fixtures sintéticas no navegador local; sem backend ou persistência. Playwright atualiza snapshots quando solicitado.

## Como mexer (para agentes)

- Entrada: `apps/visual-react/src/Harness.tsx`.
- Invariantes: preserve os limites entre demo e integração real e os contratos usados.
- Testes: `apps/visual-react/tests/visual.spec.ts`.
- Validação: `pnpm --filter @agentskit/visual-react test:visual`.
- Armadilha: comandos de build/deploy configurados não comprovam o destino atualmente ativo; confira o manifesto e o workflow do app.
- Revisão: owners em `.github/CODEOWNERS`; sem regra específica, mantenedores.

## Decisões e história

- ADR: [[agentskit ADR-0025 - Public API and compatibility gates]] (quando a alteração tocar a decisão descrita; não implica que o ADR cubra toda a implementação).
- Histórico recente (git log --oneline -15 -- apps/visual-react): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências; 2026-06-15 · 289d3ae8 · atualizações de dependências.

> [!info]- Detalhe técnico
> Manifesto e scripts: `apps/visual-react/package.json:1`; símbolo: `apps/visual-react/src/Harness.tsx:137`. O índice Doc Bridge versionado foi usado para contexto de documentação e relações, mas não pôde ser atualizado porque pnpm não está disponível.
