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
  - "apps/docs-next/package.json"
  - "apps/docs-next/app/(home)/page.tsx"
  - "apps/docs-next/scripts/docs-new.mjs"
  - "doc-bridge.config.json"
  - ".doc-bridge/index.json"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-docs-next

> [!tldr] Em linguagem comum
> Site canônico de documentação, referência e guias; também publica corpus de agentes para o Doc Bridge.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

O app Next.js combina conteúdo Fumadocs, páginas geradas e experiência Ask. O workspace é privado e não é pacote npm. [apps/docs-next/app/(home)/page.tsx:58].

## API e contratos

O workspace é privado e não publica API npm; o contrato observável é a superfície de app abaixo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | página React server | Composição principal | `apps/docs-next/app/(home)/page.tsx:58` |

Exemplo real: `<HomePage />` — `apps/docs-next/app/(home)/page.tsx:58`.

## Quem usa e do que depende

Usa pacotes AgentsKit e fontes MDX; os consumidores da documentação consultam seu corpus.

| Relação | Evidência |
|---|---|
| Dependências declaradas no manifesto | `apps/docs-next/package.json:1` |

## Dados e efeitos

Lê MDX, manifests e artefatos derivados; `prebuild` gera índices. `INDEXNOW_KEY` é lido pelo script de ping. Analytics pode enviar eventos.

## Como mexer (para agentes)

- Entrada: `apps/docs-next/app/(home)/page.tsx`.
- Invariantes: preserve os limites entre demo e integração real e os contratos usados.
- Testes: `apps/docs-next/tests/*.test.*` e fixtures; `pnpm --filter @agentskit/docs-next test`.
- Validação: `pnpm --filter @agentskit/docs-next lint`.
- Armadilha: comandos de build/deploy configurados não comprovam o destino atualmente ativo; confira o manifesto e o workflow do app.
- Revisão: owners em `.github/CODEOWNERS`; sem regra específica, mantenedores.

## Decisões e história

- ADRs específicos do app: não confirmados nesta revisão; decisões de shell compartilhado são descritas em `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md`.
- Histórico recente (git log --oneline -15 -- apps/docs-next): 2026-10-13 · 779aa601 · tolera rate limit de downloads npm; 2026-10-12 · 4e645423 · adiciona caso Doc Bridge agent-first; 2026-10-10 · e8d42064 · versiona pacotes.

> [!info]- Detalhe técnico
> Manifesto e scripts: `apps/docs-next/package.json:1`; símbolo: `apps/docs-next/app/(home)/page.tsx:58`. O índice Doc Bridge versionado foi usado para contexto de documentação e relações, mas não pôde ser atualizado porque pnpm não está disponível.
