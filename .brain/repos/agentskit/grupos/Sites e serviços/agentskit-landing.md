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
  - "apps/landing/package.json"
  - "apps/landing/app/page.tsx"
  - "apps/landing/lib/analytics-contract.ts"
  - "apps/landing/lib/posthog-client.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-landing

> [!tldr] Em linguagem comum
> Página pública que apresenta o AgentsKit e encaminha para documentação e instalação.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Home independente com identidade, dados do ecossistema e chamadas de instalação. [apps/landing/app/page.tsx:10].

## API e contratos

O workspace é privado e não publica API npm; o contrato observável é a superfície de app abaixo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | página React server | Composição principal | `apps/landing/app/page.tsx:10` |

Exemplo real: `<HomePage />` — `apps/landing/app/page.tsx:10`.

## Quem usa e do que depende

Visitantes e demais superfícies públicas do ecossistema.

| Relação | Evidência |
|---|---|
| Dependências declaradas no manifesto | `apps/landing/package.json:1` |

## Dados e efeitos

Lê estatísticas/manifests derivados em build. PostHog pode enviar eventos após opt-in; configuração por `NEXT_PUBLIC_POSTHOG_KEY` e `NEXT_PUBLIC_POSTHOG_HOST`.

## Como mexer (para agentes)

- Entrada: `apps/landing/app/page.tsx`.
- Invariantes: preserve os limites entre demo e integração real e os contratos usados.
- Testes: `apps/landing/lib/analytics-contract.test.ts`.
- Validação: `pnpm --filter @agentskit/landing build`.
- Armadilha: comandos de build/deploy configurados não comprovam o destino atualmente ativo; confira o manifesto e o workflow do app.
- Revisão: owners em `.github/CODEOWNERS`; sem regra específica, mantenedores.

## Decisões e história

- ADRs específicos do app: não confirmados nesta revisão; decisões de shell compartilhado são descritas em `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md`.
- Histórico recente (git log --oneline -15 -- apps/landing): 2026-10-13 · c7f19deb · painel público de downloads npm; 2026-10-08 · 2545678e · subpath Drizzle/Postgres ChatMemory; 2026-10-07 · bbd4d974 · transporte OpenAI compatível e partes multimodais.

> [!info]- Detalhe técnico
> Manifesto e scripts: `apps/landing/package.json:1`; símbolo: `apps/landing/app/page.tsx:10`. O índice Doc Bridge versionado foi usado para contexto de documentação e relações, mas não pôde ser atualizado porque pnpm não está disponível.
