# Phase 0 — Execution Plan (P0 → P2)

> Plano tático para as 12 tarefas prioritárias da Phase 0. Cobre 3-4 semanas.
> Ligado ao [Phase 0 PRD #211](https://github.com/EmersonBraun/agentskit/issues/211).

---

## Sprint Overview

| Sprint | Duração | Objetivo | Entregáveis |
|---|---|---|---|
| **Sprint 1** (P0) | 5 dias úteis | Narrativa + infra-base | README, Manifesto, Origin, DNS, Bundle/Coverage gates, início dos ADRs |
| **Sprint 2** (P1) | 5-7 dias úteis | Contratos formalizados + migração de docs | 6 ADRs completos, Fumadocs migrado, Concepts section |
| **Sprint 3** (P2) | 5-7 dias úteis | Polimento externo + qualidade | READMEs dos 14 packages, migration guide Vercel AI, E2E Playwright |

**Gate para Fase 1 começar**: todos os P0+P1 concluídos + ≥80% dos P2.

---

## Sprint 1 — P0 (Semana 1)

### Dia 1 — Narrativa base (baixo esforço, alta visibilidade)

**Manhã — #14 MANIFESTO.md** (2-3h)
- Criar `MANIFESTO.md` na raiz
- 5-7 princípios não-negociáveis, 1 parágrafo cada:
  1. Core < 10KB gzip, zero deps (estabilidade eterna)
  2. Plug-and-play: todo package funciona sozinho
  3. Interop radical: combinação arbitrária = zero atrito
  4. Zero lock-in: sair é `npm uninstall`
  5. Agent-first (não chat-first)
  6. TypeScript rigoroso, sem `any`
  7. Docs são produto, não afterthought
- Link no topo do README

**Tarde — #15 ORIGIN.md** (2-3h)
- Criar `ORIGIN.md` na raiz
- 500-800 palavras, tom pessoal
- Estrutura sugerida:
  - "Em [data], tentei construir [X]. Descobri que..."
  - Dor concreta (não abstrata): "LangChain tinha 200MB, Vercel AI SDK não tinha runtime, MCP não tinha UI"
  - Decisão: "Criei AgentsKit porque..."
  - Visão: "Minha aposta é que JavaScript vai ser a linguagem dos agentes porque..."

### Dia 2 — Domínio no ar

**#24 Configurar agentskit.io** (4-6h)
- Adicionar `CNAME` no repo apontando pro domínio
- DNS:
  - `agentskit.io` → Vercel/Cloudflare Pages (landing futura) OU GitHub Pages temporário
  - `docs.agentskit.io` → reservado pra Fumadocs (Sprint 2)
- SSL automático via Cloudflare
- Redirect `emersonbraun.github.io/agentskit/*` → `agentskit.io/*` (manter SEO)
- Atualizar README com novo domínio
- Verificar meta tags OG (title, description, image) apontando pro domínio correto

### Dia 3-4 — Reescrita do README raiz

**#13 README raiz reescrito** (2 dias)
- Estrutura nova (baseada em Next.js, Vercel AI SDK, Bun):
  ```
  [Logo + tagline emocional 1 linha]
  [Badges: npm, bundle, license, discord futuro]

  > One-liner pitch (25 palavras máx)

  ## Why AgentsKit?
  [4 bullets com contraste claro]

  ## Quick Start (60 segundos)
  [Código ≤15 linhas rodando chat streaming]

  ## Before / After
  [Código Vercel AI SDK vs AgentsKit lado a lado]

  ## When NOT to use AgentsKit
  [Honestidade — 3 cenários]

  ## Ecosystem
  [Diagrama Mermaid dos packages]

  ## Links
  [Docs, Manifesto, Origin, Discord, Twitter]
  ```
- Validar lendo em voz alta — tem que bater em 90s de leitura

### Dia 5 — Gates no CI (destrava qualidade futura)

**Manhã — #6 Bundle size budget** (3-4h)
- Instalar `size-limit` + plugin gzip
- Criar `.size-limit.json` na raiz com entrada por package:
  ```json
  [
    { "path": "packages/core/dist/index.js", "limit": "10 KB" },
    { "path": "packages/adapters/dist/index.js", "limit": "20 KB" }
  ]
  ```
- Workflow `.github/workflows/size.yml` rodando em cada PR
- Bloquear merge se exceder

**Tarde — #7 Coverage gate** (2-3h)
- Configurar `vitest --coverage` com threshold por package
- Mínimos: core 85%, adapters 70%, outros 60%
- Publicar badge + relatório via Codecov ou CodeClimate (grátis pra OSS)
- Workflow falha se não atingir

---

## Sprint 2 — P1 (Semanas 2-3)

### Contratos formalizados — 6 ADRs

**#3 ADRs dos contratos core** (5-7 dias, 1 ADR/dia)

Criar pasta `docs/architecture/adrs/`. Template padrão por ADR:

```markdown
# ADR 000N — <Contrato>

## Status: Accepted | Proposed | Superseded
## Date: YYYY-MM-DD
## Context
## Decision
## Contract Interface (TypeScript)
## Rationale
## Consequences (positive / negative)
## Open Questions
```

Ordem sugerida (do mais estável pro mais volátil):
- `0001-adapter-contract.md` — `Adapter`, streaming, tool calling
- `0002-tool-contract.md` — `Tool` schema, execute, validation
- `0003-memory-contract.md` — `Memory`, read/write, serialization
- `0004-retriever-contract.md` — `Retriever`, query, scoring
- `0005-skill-contract.md` — `Skill` manifest, prompt, examples
- `0006-runtime-contract.md` — `Runtime`, loop, lifecycle hooks

Cada ADR vira um PR separado → forçar discussão.

### Migração Fumadocs

**#25 Migração Docusaurus → Fumadocs** (5-7 dias)

Plano:
1. **Dia 1**: Spike técnico — scaffolding Fumadocs em branch `docs-fumadocs`, porting do index
2. **Dia 2-3**: Migrar conteúdo das 12 seções existentes (`adapters`, `agents`, `chat-uis`, `components`, `data-layer`, `examples`, `getting-started`, `hooks`, `infrastructure`, `packages`, `theming`, `contributing`)
3. **Dia 4**: Decidir estratégia i18n (Crowdin? congelar? LLM?) — RFC rápido
4. **Dia 5**: Redirects, sidebar, tema custom (paleta + tipografia alinhadas à Manifesto)
5. **Dia 6**: Deploy em `docs.agentskit.io` via Vercel
6. **Dia 7**: Publicar, arquivar Docusaurus antigo

### Concepts Section

**#26 Concepts section** (2-3 dias)
- Criar em `docs/concepts/`:
  - `mental-model.mdx` — diagrama único mostrando Agent ↔ Adapter ↔ Tool ↔ Memory ↔ Skill
  - `agent.mdx` — o que é um Agent
  - `adapter.mdx` — abstração do provider
  - `tool.mdx` — função executável
  - `skill.mdx` — prompt + behavior + examples
  - `memory.mdx` — persistência
  - `react-loop.mdx` — como ReAct funciona no AgentsKit
  - `streaming.mdx` — modelo de streaming unificado
- Linguagem consistente (glossário vive aqui)
- Cada conceito ≤600 palavras + exemplo mínimo + "quando usar" / "quando não usar"

---

## Sprint 3 — P2 (Semanas 3-4)

### READMEs dos 14 packages

**#17 Rewrite de todos os READMEs** (2-3 dias, paralelizável)

Estrutura padrão por package:
```
# @agentskit/<name>
> <tagline única — 1 linha, emoção + função>

<Pitch de 2-3 linhas>

## Install
## When to use this
## When NOT to use this
## Quick example (≤10 linhas)
## Contracts this implements
## Stability: stable | beta | experimental
## Links: Docs | Changelog | ADR
```

Taglines sugeridas:
- `@agentskit/core` — *"The 10KB soul of every AgentsKit app"*
- `@agentskit/runtime` — *"Agents that survive crashes"*
- `@agentskit/adapters` — *"Swap providers in one line"*
- `@agentskit/react` — *"Chat streaming in 10 lines"*
- `@agentskit/ink` — *"Agents in your terminal, no compromise"*
- `@agentskit/memory` — *"Remember everything, forget on your terms"*
- `@agentskit/rag` — *"RAG without the plumbing"*
- `@agentskit/tools` — *"Every tool, one contract"*
- `@agentskit/skills` — *"Behavior as a first-class primitive"*
- `@agentskit/sandbox` — *"Run untrusted code, sleep at night"*
- `@agentskit/observability` — *"See inside every agent decision"*
- `@agentskit/eval` — *"Know if your agent actually works"*
- `@agentskit/cli` — *"From idea to agent in 60 seconds"*
- `@agentskit/templates` — *"Start with something real"*

### Migration Guide Vercel AI SDK

**#30 Migration guide** (2 dias)
- Doc em `docs/migrating/vercel-ai-sdk.mdx`
- Estrutura:
  1. TL;DR (5 linhas)
  2. Tabela de equivalências (`streamText` → ?, `useChat` → ?, `tool()` → ?)
  3. 5 exemplos de migração lado a lado (basic chat, tool calling, streaming, multi-modal, RAG)
  4. O que AgentsKit adiciona que Vercel AI não tem
  5. Casos em que Vercel AI é melhor (honestidade)
- Tweet-size summary para divulgação

### E2E Playwright

**#40 E2E nos 4 exemplos** (2-3 dias)
- Setup Playwright compartilhado em `tests/e2e/`
- Um test file por `apps/example-*`:
  - `example-react.spec.ts` — chat streaming + tool call + memory persistindo
  - `example-ink.spec.ts` — usar `ink-testing-library`
  - `example-runtime.spec.ts` — agent loop completo com replay
  - `example-multi-agent.spec.ts` — delegação funcionando
- Workflow `.github/workflows/e2e.yml` rodando em PR e main
- Fixture de adapter determinístico pra evitar flakiness

---

## Tracking

### Definition of Done por tarefa

Cada issue dos P0-P2 é "done" quando:
- [ ] Código/conteúdo implementado
- [ ] Testes adicionados/atualizados (se aplicável)
- [ ] Changeset criado (se aplicável)
- [ ] PR revisado e merged
- [ ] Documentação atualizada (se afeta API)
- [ ] Item marcado no Project board

### Checkpoint semanal

Toda sexta-feira:
- Status das issues P0-P2 (done / in-progress / blocked)
- Demo curta do que ficou pronto
- Ajuste de prioridades para semana seguinte

### Riscos conhecidos

1. **Migração Fumadocs pode quebrar i18n** — mitigação: manter Docusaurus vivo em branch até nova doc ter paridade
2. **ADRs podem virar bikeshed** — mitigação: time-box de 1 dia por ADR, merge e itera depois
3. **Bundle/coverage gates podem bloquear PRs existentes** — mitigação: baseline relaxado no início, apertar em 2 semanas
4. **README reescrito pode perder info técnica** — mitigação: mover detalhes pro docs, README é porta de entrada

---

## Após Phase 0

Quando todos os gates do PRD #211 estiverem verdes:
1. Anunciar publicamente (HN + Twitter + Reddit + ProductHunt) — **evento único**
2. Abrir as 20 issues da Fase 1 (stories #1-20 do Master PRD #113)
3. Setup de Discord ativo + primeira newsletter mensal
