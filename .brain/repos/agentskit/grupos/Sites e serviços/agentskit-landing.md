---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; doc-bridge index versionado em .doc-bridge/index.json para inventário; pnpm indisponível, CLI não executada; auditado em 2026-10-16"
fontes:
  - "apps/landing/package.json"
  - "apps/landing/app/page.tsx"
  - "apps/landing/lib/analytics-contract.ts"
  - "apps/landing/lib/analytics-contract.test.ts"
  - "apps/landing/lib/posthog-client.ts"
  - "apps/landing/lib/ecosystem-stats.snapshot.json"
  - ".github/CODEOWNERS"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-landing

> [!tldr] Em linguagem comum
> Página pública de apresentação do AgentsKit, com encaminhamento para documentação e instalação. Usa analytics com consentimento explícito do visitante.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Home independente da documentação, com identidade visual, dados do ecossistema e chamadas de instalação. A home é `HomePage` (`apps/landing/app/page.tsx:10`). O workspace é privado e não é pacote npm (`apps/landing/package.json:4`, nome `@agentskit/landing` na linha 2).

## API e contratos

O workspace não publica API npm. A superfície observável é a página de entrada:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | componente de página (default export) | Página inicial. | `apps/landing/app/page.tsx:10` |

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Consumidores | Visitantes do site. Nenhum `package.json` do monorepo declara `@agentskit/landing` (o pacote é privado). |
| Dependências | Declaradas em `apps/landing/package.json`. |

## Dados e efeitos

- Lê `apps/landing/lib/ecosystem-stats.snapshot.json`, um snapshot de estatísticas do ecossistema, importado por `apps/landing/lib/ecosystem-stats.ts:6`.
- Analytics com PostHog: o envio só acontece após opt-in explícito, guardado em `localStorage` (`apps/landing/lib/posthog-client.ts:20`, `:23`).
- Variáveis lidas por `apps/landing/lib/posthog-client.ts`: `NEXT_PUBLIC_POSTHOG_KEY` (linha 14) e `NEXT_PUBLIC_POSTHOG_HOST` (linha 15), com valores padrão no próprio arquivo. Os valores não são copiados para a documentação.

## Como mexer (para agentes)

- **Comece por:** `apps/landing/app/page.tsx` (home) e `apps/landing/lib/posthog-client.ts` (analytics).
- **Testes:** `apps/landing/lib/analytics-contract.test.ts` (contrato de eventos de analytics).
- **Validação:** `pnpm --filter @agentskit/landing build` (`next build`, `apps/landing/package.json:10`) e `pnpm --filter @agentskit/landing lint` (`tsc --noEmit`, `apps/landing/package.json:12`). Não há script `test` no manifesto. Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** os comandos de build e deploy configurados não comprovam o destino ativo; confirme no manifesto e no workflow.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o app, mantenedores.

## Decisões e história

- Decisões de shell compartilhado: [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]] (`docs/architecture/adrs/0029-shared-ecosystem-web-shell.md`). Não há ADR específico do app identificado nesta revisão.
- Histórico recente (`git log --oneline -n 3 -- apps/landing`, conferido em 2026-10-16): `c7f19deb Add public npm downloads dashboard (#1840)`, `2545678e feat(memory): Drizzle/Postgres ChatMemory subpath (#1827)`, `bbd4d974 feat(adapters): free OpenAI-compatible transport and image/file parts (#1826)`.

> [!info]- Detalhe técnico
> - `apps/landing/package.json:1` — manifesto, scripts (`:10` build, `:12` lint).
> - `apps/landing/app/page.tsx:10` — `HomePage`.
> - `apps/landing/lib/posthog-client.ts:14-15` — nomes das variáveis de PostHog; `:20`, `:23` — opt-in.
> - `apps/landing/lib/analytics-contract.test.ts:1` — teste do contrato de analytics.
