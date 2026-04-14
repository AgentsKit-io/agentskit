# AgentsKit — Phase 0: Foundation Hardening PRD

> Pré-roadmap. Antes de executar as 97 issues do Master PRD (#113), solidificar bases técnicas, narrativa e infraestrutura pública. 4–6 semanas de trabalho focado.
>
> **Decisões já tomadas:**
> - Migração de **Docusaurus → Fumadocs** (Next.js-native, MDX rico, visual moderno, ideal pra lib JS)
> - Domínio próprio **agentskit.io** (já adquirido) substituindo `emersonbraun.github.io/agentskit`

---

## Problem Statement

O AgentsKit tem 14 packages funcionais, CI, changesets, Docusaurus com i18n em 3 línguas e um Master PRD com 97 user stories roadmap-ed. Mas executar esse roadmap sobre a base atual vai gerar dívida técnica e inconsistência porque:

- **Contratos não são formalmente versionados** (Adapter, Tool, Memory, Retriever). 10 adapters novos divergindo em sutilezas quebram a promessa "plug-and-play".
- **Sem stability tiers** — dev externo não sabe quais packages são seguros adotar.
- **Bundle size budget não é enforced no CI** — promessa de core <10KB pode ser quebrada silenciosamente.
- **Narrativa externa é técnica e genérica** — "complete toolkit for AI agents" não vende produto revolucionário; falta manifesto, origin story, identidade visual forte, comparação honesta incluindo quando NÃO usar.
- **Documentação é ampla e rasa** — 12 seções no Docusaurus sem "Concepts" section, sem Recipes/Cookbook profundos, sem troubleshooting, sem migration guides de LangChain/Vercel AI.
- **READMEs dos 14 packages são uniformemente genéricos (~50 linhas)** — cada package é um produto e precisa de pitch próprio.
- **Docusaurus é decisão default nunca decidida** — existe alternativa superior (Fumadocs) pra ecossistema Next/React. Já decidido migrar.
- **Domínio fraco** (`emersonbraun.github.io/agentskit`) prejudica positioning. `agentskit.io` já adquirido.
- **Governança imatura** — sem CODEOWNERS, sem Discord, sem maintainers plurais, sem RFC process, sem issue/PR templates específicos.
- **Gaps legais/business** — licença MIT ok pra OSS mas ambígua pra Cloud futuro; trademark não registrado; analytics ausente na doc.

## Solution

Executar **Phase 0 — Foundation Hardening** em 4 frentes paralelas antes de iniciar a Fase 1 do Master PRD:

1. **Contratos & governança técnica** — ADRs, stability tiers, CI gates, RFC process.
2. **Narrativa & identidade** — manifesto, origin story, visual identity mínima, landing independente em `agentskit.io`, READMEs por pacote com pitch próprio.
3. **Documentação profunda** — migração para **Fumadocs**, Concepts section, Recipes cookbook, troubleshooting/FAQ, migration guides de LangChain e Vercel AI, exemplos linkados.
4. **Infraestrutura de qualidade e comunidade** — coverage/bundle gates, E2E dos exemplos, CODEOWNERS, Discord, analytics, sponsors.

Resultado esperado: ao final da Phase 0, o projeto está **pronto pra crescer 10x sem dívida**, com narrativa que "se vende sozinha" e base técnica que suporta 97 issues sem caos.

---

## User Stories

### Frente 1 — Contratos & Governança Técnica

1. Como maintainer, quero um **ARCHITECTURE.md raiz** explicando decisões fundadoras (core zero-deps, packages independentes, por que não LangChain-style), para alinhar contribuidores.
2. Como maintainer, quero um **processo RFC aberto** com template (`.github/RFC-TEMPLATE.md` + pasta `rfcs/`), para propostas técnicas serem discutidas antes de virarem código.
3. Como dev externo, quero um **ADR versionado por contrato core** (Adapter, Tool, Memory, Retriever, Skill, Runtime), para adotar sem medo de breaking change silencioso.
4. Como dev, quero **stability tiers documentados** (stable / beta / experimental) em cada `package.json` e README, para saber o que posso usar em produção.
5. Como maintainer, quero **semver policy escrita** — o que é breaking vs patch, quando bumpa major — para aplicar consistente.
6. Como maintainer, quero **bundle size budget enforced no CI** (ex: `size-limit` ou `bundlewatch`) bloqueando PRs que quebrem core <10KB, adapters <20KB, etc.
7. Como maintainer, quero **coverage gate no CI** (mínimo 70% por package, 85% no core), para regressões em teste serem bloqueadas.
8. Como maintainer, quero **changeset lint** bloqueando PR que não declara mudança de versão.
9. Como maintainer, quero **CONVENTIONS.md por package** (`packages/adapters/CONVENTIONS.md`, etc.) descrevendo como adicionar novo adapter/tool/skill — passo-a-passo.
10. Como maintainer, quero **diagrama visual das dependências** entre packages (Mermaid no ARCHITECTURE.md) atualizado automaticamente.
11. Como maintainer, quero **CODEOWNERS** configurado por package pra auto-assign de review.
12. Como maintainer, quero **issue templates** (bug, feature request, RFC, docs) e **PR template** forçando checklist (testes, changeset, docs).

### Frente 2 — Narrativa & Identidade

13. Como visitante, quero um **README raiz reescrito** com: tagline emocional, origin story resumida, "before/after" em código, comparativo honesto (incluindo quando NÃO usar), quickstart ≤15 linhas, link pra agentskit.io.
14. Como leitor técnico, quero um **MANIFESTO.md** público (core <10KB, plug-and-play, zero lock-in, agent-first, interop radical) explicando princípios não-negociáveis.
15. Como visitante, quero uma **ORIGIN.md** — por que AgentsKit existe, que dor o autor sentiu, contexto do ecossistema JS de agentes — para criar conexão humana.
16. Como dev avaliando, quero ver na home uma **tabela de comparação honesta** vs Vercel AI SDK, LangChain.js, Mastra, assistant-ui — incluindo pontos onde outros ganham.
17. Como dev, quero um **pitch próprio no README de cada package** (`@agentskit/core — the 10KB soul`, `@agentskit/runtime — agents that survive crashes`, etc.) substituindo os READMEs genéricos atuais.
18. Como visitante, quero uma **identidade visual mínima**: logo, favicon, paleta de 3-5 cores, tipografia escolhida, social card (OG image), tema Fumadocs customizado.
19. Como visitante, quero acessar **agentskit.io** com landing page independente (Next.js) separada da documentação — públicos diferentes (marketing vs referência técnica).
20. Como dev descobrindo a lib, quero um **vídeo de 60 segundos** embedado na home mostrando "zero → chat streaming em 10 linhas" visualmente.
21. Como visitante, quero ver **social proof** na landing (GitHub stars, downloads npm, "used by", testimonials quando existirem, showcase).
22. Como maintainer, quero **conta oficial no X/Twitter** (`@agentskit` ou `@agentskitdev`) ativa com tips semanais, changelog, release notes.
23. Como dev, quero um **changelog público com narrativa** (não só CHANGELOG.md técnico) — "This month we shipped X, learned Y" — como blog/newsletter mensal.
24. Como visitante, quero **domínio agentskit.io configurado** com DNS, SSL, redirects do GitHub Pages antigo.

### Frente 3 — Documentação Profunda (migração pra Fumadocs)

25. Como maintainer, quero **migrar `apps/docs` de Docusaurus pra Fumadocs** (Next.js 15, MDX, tema moderno), preservando conteúdo existente.
26. Como dev, quero uma **seção "Concepts"** nova explicando mental model (Agent, Adapter, Skill, Tool, Memory, ReAct, Streaming) com diagrama único e linguagem consistente — antes de API reference.
27. Como dev, quero um **"Decision Tree"** de 5 perguntas ("Vai usar React? Quer terminal? Precisa de RAG?") que me diz qual combinação de packages instalar.
28. Como dev novo, quero um **Quickstart em 3 minutos** que entrega chat funcionando com streaming, tool call e memory básica.
29. Como dev, quero uma **seção "Recipes" / Cookbook** com ≥10 receitas curtas e completas (Chat com RAG em 30 linhas; Agente que lê Gmail; Discord bot; PDF Q&A; Code reviewer; Multi-agent; etc.), cada uma com Stackblitz link.
30. Como dev, quero **Migration Guide de Vercel AI SDK → AgentsKit** com code-diff lado a lado.
31. Como dev, quero **Migration Guide de LangChain.js → AgentsKit** com code-diff lado a lado.
32. Como dev, quero uma **seção "Troubleshooting / FAQ"** resolvendo os 20 erros/dúvidas mais comuns.
33. Como dev, quero **exemplos em `apps/example-*` linkados da doc** com "Edit on Stackblitz" e screenshots.
34. Como dev, quero **API reference gerada por TypeDoc** exposta dentro da Fumadocs, tipada e sempre atualizada.
35. Como dev de outra língua, quero **estratégia clara de i18n** na Fumadocs: ou manter pt-BR/es/zh-Hans com tradução automatizada (Crowdin/LLM) ou congelar até EN estabilizar — decisão documentada.
36. Como dev, quero um **Glossário** (ReAct, Tool Calling, RAG, Embedding, Adapter, Skill) linkado inline na doc.
37. Como maintainer, quero **versionamento de docs** (v0.x, v1.x) nativo na Fumadocs para não quebrar links quando bumpar major.
38. Como visitante, quero **busca full-text rápida** (Algolia DocSearch grátis pra OSS ou built-in Fumadocs).
39. Como maintainer, quero **PostHog/Plausible analytics** na doc + landing para entender quais páginas convertem, onde devs saem.

### Frente 4 — Qualidade & Comunidade

40. Como maintainer, quero **E2E Playwright** nos 4 `apps/example-*` rodando no CI garantindo que demos reais nunca quebram.
41. Como maintainer, quero **contract tests por adapter** — suite comum rodada contra OpenAI, Anthropic, Gemini, Ollama — detectando regressão quando provider muda API.
42. Como dev, quero **visual regression tests** (Playwright screenshots) nos componentes React e Ink.
43. Como maintainer, quero **fixtures de replay gravadas** (adapter calls mockados deterministicamente) para testes rápidos sem tokens reais.
44. Como comunidade, quero um **Discord oficial** (ou GitHub Discussions bem curado) com canais por package + #help + #showcase.
45. Como contribuidor, quero um **CONTRIBUTING.md expandido** com dev setup em 5 minutos, troubleshooting de build, como rodar tests, fluxo de PR.
46. Como contribuidor, quero **labels de issue bem definidas** (`good first issue`, `help wanted`, `area:adapters`, `area:docs`) aplicadas nas 97 issues existentes.
47. Como maintainer, quero **GitHub Sponsors / OpenCollective** configurado para aceitar apoio financeiro e dar credibilidade.
48. Como dev avaliando, quero ver **múltiplos maintainers** listados no README — mesmo que 2-3 no início, muda percepção de "side-project" para "projeto sério".
49. Como maintainer, quero **registro de trademark "AgentsKit"** iniciado (USPTO ou INPI) antes da visibilidade aumentar.
50. Como maintainer, quero **decisão documentada sobre licenciamento** — manter MIT? Dual-license MIT + comercial pra Cloud? BSL? — escrita em `LICENSING.md` antes de começar Fase 4 (Business).
51. Como maintainer, quero **auditoria externa paga de DX** (1 dev sênior, 2-5k reais) reviewing narrativa e primeira experiência do dev — objetividade que o autor não consegue ter sozinho.
52. Como maintainer, quero **lançamento coordenado (HN + Twitter + ProductHunt + Reddit)** planejado como evento único quando Phase 0 terminar — uma chance só, tem que ser com tudo pronto.

---

## Implementation Decisions

### Decisões já fechadas

- **Fumadocs** substituirá Docusaurus em `apps/docs`. Next.js 15 + MDX. Tema customizado alinhado à identidade visual.
- **Domínio oficial: agentskit.io** — configurar DNS apontando para Vercel/Cloudflare Pages, com subdomínios previstos: `agentskit.io` (landing), `docs.agentskit.io` (Fumadocs), `play.agentskit.io` (playground futuro).
- **Landing separada da doc** — Next.js independente em `apps/landing` ou hospedada no root do domínio; docs em subdomínio `docs.agentskit.io`.
- **Manter monorepo pnpm + Turborepo** — sem reorganização estrutural nesta fase.

### Módulos a criar/modificar

- **`apps/docs`** — migração completa para Fumadocs preservando estrutura de conteúdo; i18n revisado.
- **`apps/landing`** (novo) — Next.js pro marketing, SEO, conversão.
- **`.github/`** — issue templates, PR template, RFC template, CODEOWNERS, workflows extras (size-limit, coverage gate, e2e).
- **`rfcs/`** (novo) — pasta de RFCs versionados.
- **`docs/architecture/`** — ADRs numerados (`0001-adapter-contract.md`, `0002-tool-contract.md`, etc.).
- **`ARCHITECTURE.md`, `MANIFESTO.md`, `ORIGIN.md`, `LICENSING.md`** (novos na raiz).
- **`packages/*/CONVENTIONS.md`** (novos) — um por pacote com regras de contribuição específicas.
- **`packages/*/README.md`** — reescritos com pitch próprio + stability tier + link pra doc.
- **README.md raiz** — reescrito com narrativa forte, comparativos honestos, link pra agentskit.io.

### Módulos profundos candidatos a teste isolado

- **ContractValidator** (nasce aqui) — valida em runtime que um adapter/tool/skill implementa contrato vigente. Interface: `validate(impl, contract) → Report`.
- **BundleBudgetCheck** — wrapper sobre `size-limit` com config por package. Interface: `check(package) → Pass|Fail`.
- **AdapterContractSuite** — suite de testes que roda a mesma bateria contra qualquer adapter. Interface: `run(adapter, opts) → Report`.

### Contratos/APIs

- **ADRs serão o formato canônico** para contratos core. Mudança de contrato = novo ADR + bump major do package afetado.
- **Stability tier** declarado em `package.json` via campo custom `"stability": "stable" | "beta" | "experimental"`.
- **RFC process**: PR em `rfcs/` com template, discussão aberta, aprovação de 2+ maintainers antes de virar issue de implementação.

### Priorização sugerida (dentro dos 4-6 semanas)

- **Semana 1-2**: Frente 1 (contratos/governança) + início Frente 2 (manifesto, origin, README raiz)
- **Semana 2-4**: Frente 3 (migração Fumadocs, Concepts, Recipes) paralelo a Frente 2 (identidade visual, landing)
- **Semana 4-5**: Frente 4 (qualidade, Discord, CODEOWNERS, analytics) + migration guides
- **Semana 6**: Auditoria externa de DX + ajustes + ensaio de lançamento coordenado

### Breaking changes

- Phase 0 **não pode introduzir breaking changes** em packages publicados. É hardening, não refactor.
- READMEs reescritos, docs migradas, CI apertado — tudo ortogonal ao runtime.

---

## Testing Decisions

### O que faz bom teste aqui

- **Contract tests reutilizáveis** por categoria (adapter, tool, skill) — uma bateria que qualquer implementação futura roda automaticamente.
- **E2E dos exemplos é o teste mais importante** — se `example-react` funciona com chat streaming + tool call + memory, a lib funciona.
- **Evitar snapshot de strings de LLM** — usar matchers estruturais ou tolerância semântica quando necessário.

### Módulos com teste

- **ContractValidator, BundleBudgetCheck, AdapterContractSuite** — módulos profundos criados nesta fase.
- **E2E Playwright** em `apps/example-react`, `apps/example-ink`, `apps/example-runtime`, `apps/example-multi-agent`.
- **Visual regression** em componentes críticos do `@agentskit/react` (ChatContainer, Message, InputBar) e `@agentskit/ink`.

### Prior art

- Vitest já é o runner. Manter.
- `size-limit` ou `bundlewatch` tem template pronto pra CI GitHub Actions.
- Playwright setup de monorepo: usar um `playwright.config.ts` compartilhado.

---

## Out of Scope

- **Implementação de qualquer story do Master PRD (#113 e filhas #114-#210)** — fica para Fase 1 em diante.
- **AgentsKit Cloud** e qualquer trabalho comercial — Fase 4.
- **Novos packages** — Phase 0 só hardeniza os 14 existentes, não adiciona (exceto `apps/landing`).
- **Rebranding de nome** — "AgentsKit" fica; só ganha identidade visual forte.
- **Reescrita de core** — core tá ok, só precisa de contratos formalizados.
- **Criar Python SDK** — permanece fora do escopo.

---

## Further Notes

### Como este PRD vira issues

Cada user story (1-52) vira 1 issue GitHub com:
- Título: `[Phase 0] Story NN — <resumo>`
- Label: `phase-0-foundation` + label de frente (`frente-contratos`, `frente-narrativa`, `frente-docs`, `frente-qualidade`)
- Link de volta para este PRD.

### Gates pra Phase 1 começar

Nenhuma issue do Master PRD deve ser iniciada até que **todas estas** sejam verdade:

- [ ] ADRs dos 6 contratos core publicados (Adapter, Tool, Memory, Retriever, Skill, Runtime)
- [ ] Bundle budget e coverage gate ativos e bloqueando PRs
- [ ] README raiz reescrito + MANIFESTO + ORIGIN publicados
- [ ] agentskit.io no ar com landing básica
- [ ] Migração para Fumadocs concluída com Concepts section e ≥5 Recipes
- [ ] Migration guides LangChain e Vercel AI publicados
- [ ] E2E Playwright rodando nos 4 exemplos
- [ ] Discord + CODEOWNERS + issue/PR templates ativos
- [ ] Decisão sobre licenciamento documentada

### Apostas não-negociáveis da fase

1. **Formalizar contratos** antes de adicionar 10 adapters novos.
2. **Reescrever narrativa** antes de lançar publicamente.
3. **Fumadocs + agentskit.io** antes de aumentar tráfego.
4. **E2E dos exemplos** antes de aceitar 97 PRs de features.

### Princípios (já no CLAUDE.md, reforçados)

- Core <10KB gzip, zero deps.
- Todo package plug-and-play.
- Interop total entre packages.
- Named exports only, no default exports.
- TypeScript strict, sem `any`.
