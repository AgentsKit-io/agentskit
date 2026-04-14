# AgentsKit — Master Execution Plan

> Plano mestre de execução dos 149 issues (Phase 0 + Fases 1-4).
> Sequência, dependências, sprints, gates e ordem sugerida.
>
> **Documentos relacionados:**
> - [Master PRD #113](https://github.com/EmersonBraun/agentskit/issues/113) — 97 issues do roadmap de produto
> - [Phase 0 PRD #211](https://github.com/EmersonBraun/agentskit/issues/211) — 52 issues de foundation hardening
> - [`PHASE-0-EXECUTION-PLAN.md`](./PHASE-0-EXECUTION-PLAN.md) — plano detalhado P0→P2
> - [Project Board](https://github.com/users/EmersonBraun/projects/1)

---

## Visão geral

| Período | Fase | Issues | Objetivo |
|---|---|---|---|
| **Semanas 1-6** | **Phase 0** (Foundation) | 52 (#212-#263) | Base sólida: contratos, narrativa, Fumadocs, agentskit.io, qualidade |
| **Meses 2-4** | **Fase 1** (Foundation UX) | 20 (#114-#133) | DX que vira viral — init, doctor, dev, devtools, recipes |
| **Meses 4-7** | **Fase 2** (Evolução) | 31 (#134-#164) | Diferenciação técnica real — replay, router, memory, security |
| **Meses 7-10** | **Fase 3** (Expansão) | 34 (#165-#198) | Adapters, tools, MCP bridge, multi-framework, verticais |
| **Meses 10-12** | **Fase 4** (Business) | 12 (#199-#210) | Cloud, marketplace, enterprise, parcerias |

**Total**: ~12 meses de roadmap claro. Revisão trimestral obrigatória pra recalibrar.

---

## Estrutura de Sprints

Sprints de **2 semanas**. Ao longo dos 12 meses, ~26 sprints.

### Mapeamento Fase → Sprints → Issues

| Sprint | Semanas | Fase | Foco | Issues-alvo |
|---|---|---|---|---|
| **S1** | 1-2 | Phase 0 | Narrativa + CI gates | P0: #225, #226, #235, #217, #218, #224 |
| **S2** | 3-4 | Phase 0 | Contratos + Fumadocs início | P0/P1: #214, #225→#238 (Fumadocs spike) |
| **S3** | 5-6 | Phase 0 | Fumadocs full + Concepts + READMEs pacotes | P1/P2: #238, #239, #228, READMEs |
| **S4** | 7-8 | Phase 0 wrap | Migration guides + E2E + Discord + LICENSE | #241, #242, #243, #255, #261 |
| **S5** | 9-10 | **🚀 Launch + Fase 1 início** | Anúncio coordenado + init/doctor | #263 (launch) + #114 #115 #116 |
| **S6** | 11-12 | Fase 1 | Dev server + tunnel + streaming | #117 #118 #121 |
| **S7** | 13-14 | Fase 1 | useChat + cost guard + hot-swap | #119 #120 #121 #122 #123 |
| **S8** | 15-16 | Fase 1 | Docs chat + decision tree + migration guides | #124 #125 #126 #127 #128 |
| **S9** | 17-18 | Fase 1 wrap | Error didáticos + tipos + roadmap público | #129 #130 #131 #132 #133 |
| **S10** | 19-20 | Fase 2 | Deterministic replay + snapshot + diff | #134 #135 #136 |
| **S11** | 21-22 | Fase 2 | Time travel + token budget + speculative | #137 #138 #139 |
| **S12** | 23-24 | Fase 2 | Streaming progressivo + context + multi-modal | #140 #141 #142 |
| **S13** | 25-26 | Fase 2 | Schema-first + agentskit ai + router adapter | #143 #144 #145 |
| **S14** | 27-28 | Fase 2 | Ensemble + fallback + devtools | #146 #147 #148 |
| **S15** | 29-30 | Fase 2 | Trace viewer + evals CI + A/B | #149 #150 #151 |
| **S16** | 31-32 | Fase 2 | Hierarchical memory + summarization + RAG reranking | #152 #153 #154 #155 |
| **S17** | 33-34 | Fase 2 wrap | Durable + multi-agent + HITL + background | #156 #157 #158 #159 |
| **S18** | 35-36 | Fase 2 security | PII + prompt injection + audit + rate-limit + sandbox | #160 #161 #162 #163 #164 |
| **S19** | 37-38 | Fase 3 | Major adapters (10+ providers) | #165 #166 |
| **S20** | 39-40 | Fase 3 | MCP bridge + tool composer | #167 #168 |
| **S21** | 41-42 | Fase 3 | Tools dev ecosystem (GitHub, Linear, Slack) | #169 #170 #171 |
| **S22** | 43-44 | Fase 3 | Tools scraping/image/voice/maps | #172 #173 #174 #175 |
| **S23** | 45-46 | Fase 3 | Browser agent + self-debug + memory adapters | #176 #177 #178 |
| **S24** | 47-48 | Fase 3 | Memory graph + encryption + skills | #179 #180 #181 #182 #183 |
| **S25** | 49-50 | Fase 3 | UI multi-framework (Vue/Svelte/Solid) + RN | #184 #185 #186 |
| **S26** | 51-52 | Fase 3 wrap | Edge + Browser-only + verticais + A2A | #187 #188 #189 #190 #191 #192 #193 #194 #195 #196 #197 #198 |
| **S27+** | 53+ | **Fase 4** | Cloud, marketplace, enterprise | #199-#210 |

> Nota: capacidade assumida = **1-2 devs**. Com mais gente, compactar sprints.

---

## Dependências críticas

### Antes de qualquer coisa da Fase 1
- ✅ ADRs dos contratos (#214) concluídos
- ✅ Bundle/coverage gates (#217 #218) ativos
- ✅ agentskit.io no ar (#235)
- ✅ Fumadocs migrado (#238)
- ✅ README + Manifesto + Origin (#224 #225 #226) publicados
- ✅ E2E Playwright nos exemplos (#251)

### Dependências entre features

```
#3 ADRs contratos ─────┬──> toda Fase 1 (precisa de contrato estável)
                        └──> toda Fase 3 (novos adapters/tools)

#54 MCP bridge (F3) ──> #31 agentskit ai (F2) — precisa MCP tools
#21 Deterministic replay (F2) ──> #39 Replay sessões + #43 Fixtures testes
#77 AgentsKit Edge (F3) ──> #86 Cloud free tier (F4) — runtime edge
#69 Skill marketplace (F3) ──> #91 Revenue share (F4)
#81 A2A Protocol (F3) ──> parcerias estratégicas (F4)
```

### Capacity warnings
- **S16-S18** (memory + security + durability) são **pesadas** — considerar 3 sprints ao invés de 2
- **S19 adapters major** requer chaves API de 10+ providers — preparar orçamento/credenciais antes
- **S20 MCP bridge** é arquitetural pesado — alocar dev sênior

---

## Gates por fase (não pular)

### Gate Phase 0 → Fase 1
- [ ] 6 ADRs core merged
- [ ] Bundle/coverage gates bloqueando PRs
- [ ] agentskit.io resolvendo + docs.agentskit.io no ar
- [ ] README raiz reescrito + Manifesto + Origin publicados
- [ ] Fumadocs com Concepts section + ≥5 recipes
- [ ] Migration guides LangChain + Vercel AI publicados
- [ ] E2E Playwright rodando nos 4 exemplos
- [ ] Discord com ≥20 membros + CODEOWNERS ativo
- [ ] LICENSING.md decidido
- [ ] **Lançamento coordenado executado** (HN/Twitter/PH/Reddit)

### Gate Fase 1 → Fase 2
- [ ] 20 stories da Fase 1 done ou explicitamente descopadas
- [ ] `npx agentskit init` com ≥1000 downloads/mês
- [ ] Discord com ≥200 membros
- [ ] ≥3 usuários externos compartilhando projetos publicamente

### Gate Fase 2 → Fase 3
- [ ] Deterministic replay + devtools funcionais (diferenciação técnica real)
- [ ] Security layer completa
- [ ] Memoria hierárquica + RAG reranking shipped
- [ ] ≥10 stars/semana crescimento consistente
- [ ] 1+ case study publicado

### Gate Fase 3 → Fase 4
- [ ] 10+ adapters estáveis
- [ ] MCP bridge bidirecional funcional
- [ ] ≥1 parceria estratégica anunciada (Vercel, Cloudflare, provider)
- [ ] Base de usuários ≥5k DAU

---

## Ritmo & cerimônias

### Diário
- Status update no Discord `#maintainers` (2 linhas — done/doing/blocked)

### Semanal — toda sexta 17h
- **Sprint Review** (30min): demo do que ficou pronto
- **Planning** próxima semana (30min): ajustar prioridades

### Quinzenal — fim de cada sprint
- **Retro** (30min): o que funcionou, o que não, o que mudar
- Atualizar Project board: mover concluídos, reestimar pending

### Mensal
- **Community update** — blog post / newsletter
- **Review do roadmap completo** — alguma Fase precisa recalibrar?

### Trimestral
- **Roadmap review público** — RFC de ajustes
- **Eval de métricas** — stars, downloads, Discord, contribuidores

---

## Métricas de sucesso

### Phase 0 (3 meses)
- agentskit.io indexado no Google
- Launch coordenado com ≥1000 visitas na semana
- ≥500 stars no repo
- ≥20 membros no Discord

### Fase 1 (fim do mês 4)
- ≥1000 downloads/mês npm
- ≥200 membros Discord
- ≥5 contribuidores externos com PRs merged

### Fase 2 (fim do mês 7)
- ≥5000 downloads/mês
- ≥1 post em Hacker News front page
- Cobertura em ≥3 newsletters tech (Node Weekly, JS Weekly, etc.)

### Fase 3 (fim do mês 10)
- ≥20k downloads/mês
- 10+ adapters maduros
- ≥10 projetos open-source públicos usando AgentsKit

### Fase 4 (fim do ano 1)
- Cloud com ≥100 usuários ativos
- Primeiro cliente enterprise
- Break-even no custo de infra

---

## Project Board — configuração recomendada

Adicionar campo **Iteration** (sprint tracker) com:
- Sprints S1 a S27 como opções
- Preenchido antecipadamente para issues das próximas 2-3 iterations

Criar **Views**:
1. **🔥 Current Sprint** — filtro: `iteration = current`, group by Status
2. **📅 Roadmap Timeline** — layout: Roadmap, group by Phase
3. **🎯 By Priority** — filtro: `iteration = current or next`, group by Priority
4. **🧭 Backlog Planning** — filtro: `iteration is empty`, group by Phase
5. **📦 By Package** — group by Category/Package

---

## Próximas ações concretas (começar hoje)

### Esta semana (Sprint 1 start)
1. **Criar branch `foundation/manifesto-origin`** — rascunhar MANIFESTO.md + ORIGIN.md
2. **Comprar serviço DNS + Cloudflare pro agentskit.io** — apontar `CNAME` provisório
3. **Setup `size-limit` em um package de teste** (core) — validar fluxo antes de replicar
4. **Criar issue/PR templates na `.github/`** — desbloqueio pra tudo que virá
5. **Decidir hoster da doc nova**: Vercel vs Cloudflare Pages (recomendo Vercel pela integração Fumadocs/Next.js)

### Próxima semana
1. Finalizar MANIFESTO + ORIGIN em PR aprovado
2. Começar reescrita do README raiz (bloco por bloco)
3. Spike Fumadocs em branch separado
4. Abrir primeiro ADR (`0001-adapter-contract.md`) como RFC público

### Semana 3
1. Parity check Docusaurus vs Fumadocs
2. Continuar ADRs (meta: 1/dia)
3. CODEOWNERS + issue templates merged
4. Ativar bundle/coverage gates em main

---

## Princípios de execução

1. **Done é melhor que perfeito** — aceitar v0.1 das coisas e iterar
2. **Publicar em público** — RFCs, ADRs, decisões tudo aberto
3. **Time-box agressivo** — toda tarefa tem limite; se estourar, re-avaliar
4. **Diariamente fazer pelo menos 1 issue mover** — momentum importa
5. **Nunca iniciar uma fase com a anterior incompleta** — gates existem por motivo
6. **Dogfood** — AgentsKit deve ser usado pra construir AgentsKit (chat da doc, agente de release, etc.)
