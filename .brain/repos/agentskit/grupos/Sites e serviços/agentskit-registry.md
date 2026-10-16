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
  - "apps/registry/package.json"
  - "apps/registry/app/(home)/page.tsx"
  - "apps/registry/components/ask-widget.tsx"
  - "apps/registry/lib/registry.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-registry

> [!tldr] Em linguagem comum
> Catálogo visual para descobrir agentes prontos e copiar comandos de instalação.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

A home carrega itens e categorias; filtros encaminham para `/agents`. [apps/registry/app/(home)/page.tsx:21].

## API e contratos

O workspace é privado e não publica API npm; o contrato observável é a superfície de app abaixo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | página Next assíncrona | Composição principal | `apps/registry/app/(home)/page.tsx:21` |

Exemplo real: `await HomePage({ searchParams })` — `apps/registry/app/(home)/page.tsx:21`.

## Quem usa e do que depende

Consome catálogo de [[00 Hub - agentskit-registry]] e Ask de [[agentskit-ask-backend]].

| Relação | Evidência |
|---|---|
| Dependências declaradas no manifesto | `apps/registry/package.json:1` |

## Dados e efeitos

Lê catálogo/index remotos; revalidação da home a cada 3600s. Widget Ask persiste thread em localStorage e envia requisições a `NEXT_PUBLIC_ASK_ENDPOINT`.

## Como mexer (para agentes)

- Entrada: `apps/registry/app/(home)/page.tsx`.
- Invariantes: preserve os limites entre demo e integração real e os contratos usados.
- Testes: `apps/registry/lib/*.test.ts`; `pnpm --filter @agentskit/registry-app test`.
- Validação: `pnpm --filter @agentskit/registry-app lint`.
- Armadilha: comandos de build/deploy configurados não comprovam o destino atualmente ativo; confira o manifesto e o workflow do app.
- Revisão: owners em `.github/CODEOWNERS`; sem regra específica, mantenedores.

## Decisões e história

- ADR: [[agentskit ADR-0033 - Registry ecosystem shell]] (quando a alteração tocar a decisão descrita; não implica que o ADR cubra toda a implementação).
- Histórico recente (git log --oneline -15 -- apps/registry): 2026-10-13 · c7f19deb · painel público de downloads npm; 2026-10-02 · e710dafa · build docs/registry para Workers via vinext; 2026-09-27 · 7c448e49 · roteia dependências por cross-platform.

> [!info]- Detalhe técnico
> Manifesto e scripts: `apps/registry/package.json:1`; símbolo: `apps/registry/app/(home)/page.tsx:21`. O índice Doc Bridge versionado foi usado para contexto de documentação e relações, mas não pôde ser atualizado porque pnpm não está disponível.
