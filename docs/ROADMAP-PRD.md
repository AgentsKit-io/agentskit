# AgentsKit — Master PRD & Roadmap

> Documento base consolidando ~160 ideias do brainstorm em um roadmap faseado.
> Cada item é uma **semente de issue** — deve virar issue GitHub independente na fase de execução.

---

## Problem Statement

Desenvolvedores JavaScript/TypeScript que querem construir aplicações com agentes de IA hoje enfrentam um ecossistema fragmentado:

- **Vercel AI SDK** é ótimo pra chat em Next.js, mas fraco em runtime de agentes, memória, multi-agent e terminal.
- **LangChain.js** é pesado, difícil de debugar, com abstrações vazando e bundle gigante.
- **Mastra** e similares são promissores mas ainda limitados em UI, adapters e tooling.
- **MCP** resolve tool interop mas não dá UI, runtime ou orquestração.

O resultado: pra construir um agente JS "de verdade" (com UI React/terminal, memória persistente, RAG, multi-agent, observability, deploy em edge), o dev precisa juntar 5-8 libs incompatíveis, gastar semanas em integração e ainda assim fica sem debugging decente, sem eval, sem replay.

Faltam também: experiência inicial (scaffolding), docs dogfooded, marketplace de tools/skills, e padrões abertos de interop entre ecossistemas.

## Solution

**AgentsKit** — toolkit modular e plug-and-play que cobre o ciclo de vida completo do agente JS:

- **Core leve** (<10KB gzip, zero deps) como fundação estável
- **Packages independentes** e combináveis (React, Ink, CLI, runtime, tools, skills, memory, RAG, sandbox, observability, eval)
- **DX de primeira classe**: scaffolding, hot-reload, devtools, deterministic replay
- **Marketplace** aberto de tools e skills com versionamento
- **Interop radical**: MCP bidirecional, Agent-to-Agent protocol, migração 1-comando de LangChain/Vercel AI
- **Edge-ready**: roda em Cloudflare Workers, Deno Deploy, browser puro (WebLLM)
- **Cloud opcional** (free tier generoso) + enterprise self-hosted como camada de monetização

Meta: ser **o Vercel/Next.js da era dos agentes** — opinionado onde importa, extensível onde necessário, o default recomendado por providers (OpenAI, Anthropic, xAI).

---

## Fases

### Fase 1 — Fundação & Melhorias do Ecossistema (0–3 meses)
Objetivo: solidificar o core, eliminar atrito de onboarding, tornar a lib "usável por estranho numa tarde".

### Fase 2 — Evolução Técnica (3–6 meses)
Objetivo: diferenciação técnica real — features que ninguém mais tem bem feito. É o que vira post no Hacker News.

### Fase 3 — Expansão do Ecossistema (6–9 meses)
Objetivo: ampliar superfície — multi-framework, marketplaces, verticais, protocolos abertos.

### Fase 4 — Business & Monetização (9–12 meses)
Objetivo: camada comercial sustentável sem comprometer open-source.

---

## User Stories

### Fase 1 — Fundação

1. Como dev novato no AgentsKit, quero rodar `npx agentskit init` e escolher template interativamente, para ter um projeto funcionando em menos de 2 minutos.
2. Como dev, quero rodar `agentskit doctor` e ver env vars faltando, versões incompatíveis e keys inválidas, para não perder tempo debugando config.
3. Como dev, quero `agentskit dev` com hot-reload de prompts/tools/memory, para iterar rápido sem reiniciar.
4. Como dev, quero `agentskit tunnel` para expor meu agente local com URL pública temporária, para testar webhooks.
5. Como dev, quero retry com backoff e circuit breaker automáticos nos adapters, para não escrever esse boilerplate.
6. Como dev em dev/teste, quero modo "dry run" que simula respostas LLM mockadas, para rodar testes sem gastar tokens.
7. Como dev, quero streaming zero-config (detectado por capability do provider), para não configurar manualmente.
8. Como dev frontend, quero `useChat` com optimistic UI, edição e regeneração de mensagens nativos.
9. Como dev que paga a conta, quero cost guard com limite por sessão/usuário e alerta, para não tomar susto no fim do mês.
10. Como dev, quero contador de tokens universal antes do envio, abstraído do tokenizer de cada provider.
11. Como dev, quero poder trocar de provider (OpenAI ↔ Anthropic) em runtime sem reiniciar, para fallback e A/B.
12. Como dev visitando a doc, quero um chat embutido que responde sobre a própria lib usando RAG na doc.
13. Como dev avaliando, quero um "decision tree" de 5 perguntas que me diz qual package eu preciso.
14. Como dev vindo de LangChain/Vercel AI, quero um migration guide concreto com code-diff lado a lado.
15. Como dev lendo a doc, quero Stackblitz "Edit on..." em cada exemplo, para testar sem clonar.
16. Como dev, quero ver recipes curtas ("chat com RAG em 30 linhas", "agente que lê Gmail") antes de ler referência completa.
17. Como dev, quero ver um comparativo honesto AgentsKit vs Vercel AI SDK vs LangChain vs Mastra.
18. Como dev, quero error messages didáticos estilo Rust compiler — com link pra doc + sugestão de fix.
19. Como dev escrevendo tool, quero que o schema Zod/JSON do tool vire tipo TypeScript do retorno automaticamente.
20. Como maintainer, quero public roadmap + processo RFC aberto no GitHub, para alinhar comunidade.

### Fase 2 — Evolução Técnica

21. Como dev debugando, quero **deterministic replay**: gravar seed + todas as chamadas LLM e reproduzir bit-a-bit, para debugar flakiness.
22. Como dev, quero **snapshot testing de prompts** com tolerância semântica, estilo Jest snapshot.
23. Como dev, quero **prompt diff tool** que mostra qual mudança causou qual mudança de output (git blame pra prompts).
24. Como dev, quero **time travel debug** no trace viewer — voltar no tempo, alterar output de tool, re-rodar.
25. Como dev, quero **token budget compiler** — declaro "esse agente tem 10k tokens" e o framework otimiza prompts/memória.
26. Como dev, quero **speculative execution** — rodar N caminhos em paralelo com modelos baratos, escolher o melhor.
27. Como dev, quero **streaming tool calls progressivos** — tool começa executar antes do LLM terminar args (quando schema permite).
28. Como dev, quero **context window virtualization** transparente, para suportar conversas gigantes.
29. Como dev, quero **multi-modal unificado** — mesma API pra texto/imagem/áudio/vídeo independente do provider.
30. Como dev, quero **schema-first agents** — definir agente em YAML/JSON e gerar TS tipado.
31. Como dev, quero **`npx agentskit ai`** — descrevo agente em português e gera config + tools + skill.
32. Como dev, quero **adapter "router"** — escolhe modelo automaticamente por custo/latência/task.
33. Como dev, quero **adapter "ensemble"** — manda pra N modelos e agrega (voting/best-of).
34. Como dev, quero **adapter "fallback chain"** declarativa com scores de confiança.
35. Como dev, quero **devtools browser extension** que inspeciona mensagens, tool calls, tokens e custos em tempo real.
36. Como dev, quero **trace viewer local** estilo Jaeger pra debug offline.
37. Como dev, quero rodar **evals em CI** via GitHub Action com datasets templates.
38. Como dev, quero **A/B testing de prompts** integrado com feature flags (PostHog/GrowthBook).
39. Como dev, quero **replay de sessões** re-rodando com outro modelo pra comparar.
40. Como dev, quero **hierarchical memory** (working/episodic/semantic) estilo MemGPT out-of-the-box.
41. Como dev, quero **auto-summarization** quando context window enche.
42. Como dev, quero **RAG com re-ranking** (Cohere Rerank, BGE) e **hybrid search** (BM25 + vector).
43. Como dev, quero **durable execution** estilo Temporal — agente sobrevive a crash.
44. Como dev, quero **multi-agent topologies** prontas (supervisor, swarm, hierarchical, blackboard).
45. Como dev, quero **human-in-the-loop primitives** — pause/resume/approve persistido.
46. Como dev, quero **background agents** que rodam em cron ou reagem a webhooks.
47. Como dev preocupado com segurança, quero **PII redaction middleware** antes do envio.
48. Como dev, quero **prompt injection detector** built-in (ex: Llama Guard local).
49. Como dev enterprise, quero **audit log assinado** pra compliance SOC2/HIPAA.
50. Como dev, quero **rate limiting** por user/IP/key.
51. Como dev, quero **tool sandbox obrigatório** (WebContainer/isolated-vm) pra tools que executam código.

### Fase 3 — Expansão

52. Como dev, quero adapters para **Mistral, Cohere, Together, Groq, Fireworks, Replicate, OpenRouter, Bedrock, Azure OpenAI, Vertex AI, xAI/Grok, HuggingFace**.
53. Como dev, quero adapter para **modelos locais** (llama.cpp, LM Studio, vLLM, Ollama).
54. Como dev, quero **MCP bridge bidirecional** — consumir qualquer MCP server E publicar tools AgentsKit como MCP.
55. Como dev, quero **tool composer** pra encadear N tools em uma macro tool.
56. Como dev, quero tools prontos: **GitHub, Linear, Jira, Notion, Asana, Slack, Discord, Teams, WhatsApp**.
57. Como dev, quero tools: **Google Workspace (Drive, Docs, Sheets, Calendar, Gmail), Microsoft 365**.
58. Como dev, quero tools: **Stripe, Supabase, Postgres, MySQL, Mongo (com safe-mode), S3/R2/GCS**.
59. Como dev, quero tools: **web scraping (Playwright + Firecrawl + Reader), PDF/DOCX/XLSX parsing**.
60. Como dev, quero tools: **image gen (DALL-E, Flux, SD, Recraft), TTS/STT (ElevenLabs, Whisper, Deepgram)**.
61. Como dev, quero tools: **Maps, Weather, CoinGecko, Yahoo Finance**.
62. Como dev, quero **Browser Agent tool** (Playwright + visão, clicar e preencher forms) em sandbox isolado.
63. Como dev, quero **self-debug tool** — agente recebe erro de tool call e tenta corrigir sozinho.
64. Como dev, quero **memory adapters**: Postgres+pgvector, Pinecone, Qdrant, Chroma, Weaviate, Turso, Cloudflare Vectorize, Upstash.
65. Como usuário final, quero **memória com criptografia client-side** onde eu controlo a chave.
66. Como dev, quero **memory graph** (grafo não-linear de relações).
67. Como dev, quero **personalization layer** — perfil de user persistido entre sessões.
68. Como dev, quero **doc loaders prontos**: URL, PDF, GitHub repo, Notion, Confluence, Drive.
69. Como dev, quero **skill marketplace** com versionamento e ratings (estilo npm).
70. Como dev, quero skills prontos: **code reviewer, test writer, PR describer, commit gen, SQL gen, translator, email triager, meeting summarizer, lead qualifier, debate agents, agent auditor**.
71. Como dev frontend, quero **shadcn/ui registry** — `npx shadcn add agentskit-chat`.
72. Como dev frontend, quero componentes pra **Vue, Svelte, Solid, Qwik**.
73. Como dev mobile, quero **React Native + Expo** package.
74. Como dev, quero **generative UI** — modelo retorna JSON estruturado e componentes renderizam.
75. Como dev, quero **voice mode** component (push-to-talk, VAD, barge-in).
76. Como dev, quero **artifact rendering** (code, charts, markdown, HTML sandbox) estilo Claude.ai.
77. Como dev de edge, quero **AgentsKit Edge** — runtime mínimo <50KB com cold start <10ms em Cloudflare Workers/Deno Deploy.
78. Como dev, quero **AgentsKit Browser-only** com WebLLM/WebGPU (100% client-side).
79. Como dev de extensão, quero **AgentsKit for VS Code**, **Raycast/Alfred**, **embedded/IoT**.
80. Como dev de verticais, quero **templates: Healthcare (HIPAA), Finance (SOX), E-commerce (Shopify), DevRel/Support, Education, Gaming**.
81. Como dev, quero **Agent-to-Agent Protocol (A2A)** — spec aberta pra agentes de ecossistemas diferentes conversarem.
82. Como dev, quero **Skill Manifest Spec** e **Tool Manifest compatível com MCP** — interop com LangChain/Mastra.
83. Como dev, quero **Open Eval Format** — datasets e resultados trocáveis entre AgentsKit/Braintrust/LangSmith.
84. Como dev, quero **`agentskit flow`** — editor visual YAML que compila pra DAG durável.
85. Como maintainer da comunidade, quero **awesome-agentskit** curado, **Agent of the Week**, **AgentsKit University** (curso em vídeo), **hackathons mensais**, **bounty program**.

### Fase 4 — Business & Monetização

86. Como dev hobbyista, quero **AgentsKit Cloud Free Tier** generoso (agentes + 1 vector store pequeno) — para testar sem cartão.
87. Como dev profissional, quero **AgentsKit Cloud** com hosted runtime, observability, vector store e deploy 1-click.
88. Como dev, quero **Pro Marketplace** com tools premium licenciados por usuário.
89. Como empresa enterprise, quero **self-hosted air-gapped + SOC2/HIPAA** com suporte dedicado.
90. Como empresa, quero **SSO (SAML/OIDC), audit log completo, multi-tenant isolation**.
91. Como autor de skill/tool popular, quero **revenue share** quando meu asset é usado no marketplace.
92. Como empresa, quero **AgentsKit Certification** program — selo oficial pra projetos e devs.
93. Como comunidade, quero **AI Agent Conference** anual organizada pelo AgentsKit.
94. Como cliente enterprise, quero **parceria com Vercel** (deploy button oficial), **Cloudflare Workers** (runtime edge otimizado), **Bun/Deno** (first-class).
95. Como dev, quero **co-marketing com providers** — Anthropic/OpenAI/xAI recomendando AgentsKit como caminho JS oficial.
96. Como ops team, quero **Carbon-aware + cost-aware routing** com selo "green agent" público.
97. Como dev de produção crítica, quero **Agent Insurance** — garantia de output via ensemble + validator com reembolso em falha.

---

## Implementation Decisions

### Arquitetura geral
- **Monorepo pnpm + Turborepo** já existente — manter.
- `@agentskit/core` permanece zero-deps, <10KB gzip. Tudo novo vai em pacotes separados.
- Novos packages sugeridos: `@agentskit/devtools`, `@agentskit/edge`, `@agentskit/replay`, `@agentskit/eval`, `@agentskit/cloud-sdk`, `@agentskit/vue`, `@agentskit/svelte`, `@agentskit/native`.
- Cada adapter novo é um subpath: `@agentskit/adapters/mistral`, etc.

### Módulos profundos (candidatos a testes isolados)
- **ReplayEngine** — grava/reproduz sessões deterministicamente. Interface: `record(session)`, `replay(id, patches?)`. Encapsula seed mgmt, serialização de LLM calls, diff semântico.
- **TokenBudgetCompiler** — recebe prompt tree + budget, retorna prompt otimizado. Interface: `compile(tree, budget) → OptimizedPrompt`.
- **RouterAdapter** — seleciona provider por policy. Interface: `route(request, policy) → Adapter`.
- **MemoryGraph** — grafo de entidades/episódios/goals. Interface: `add(node, edges)`, `query(traversal)`.
- **ToolSandbox** — executa código untrusted. Interface: `run(code, limits) → Result`.
- **PromptDiffer** — compara outputs semanticamente. Interface: `diff(outputA, outputB) → DiffReport`.
- **EvalRunner** — roda test suite contra agente. Interface: `run(agent, dataset, metrics) → Report`.

### Contratos/APIs
- **A2A Protocol** — spec JSON-RPC sobre HTTP/WebSocket, versionada. Manter compat com MCP onde possível.
- **Skill Manifest** — JSON schema público com `name`, `description`, `systemPrompt`, `examples`, `version`, `compatible: ["agentskit@^1", "langchain@^0.3"]`.
- **Tool Manifest** — superset do MCP tool manifest; se só usar subset MCP, deve rodar em MCP clients sem modificação.
- **Open Eval Format** — OpenAI evals + extensões (latency, cost, carbon).

### Priorização dentro de cada fase
Dentro de uma fase, priorizar por: (1) impacto na narrativa pública, (2) desbloqueio de outras features, (3) esforço. Matriz detalhada em issue separada quando a fase começar.

### Breaking changes
- Fases 1-2 não introduzem breaking changes no core.
- Fase 3 pode bumpar `@agentskit/react` pra v2 se necessário (generative UI).
- Changesets obrigatório em todo PR.

---

## Testing Decisions

### O que faz um bom teste aqui
- Testa **comportamento externo**, não implementação. Ex: "quando LLM retorna tool_call, tool é invocado com args corretos" — não "o método `_parseToolCall` é chamado".
- Usa **adapters mock determinísticos** (gravados via ReplayEngine) em vez de mocks manuais frágeis.
- Evita snapshot testing de strings cruas de LLM — usa tolerância semântica ou matchers estruturados.

### Módulos que devem ter testes
- **ReplayEngine, TokenBudgetCompiler, RouterAdapter, MemoryGraph, ToolSandbox, EvalRunner, PromptDiffer** — módulos profundos, alta alavancagem de teste.
- Cada **adapter** novo: teste de contract (streaming, tool calling, multi-modal se aplicável) rodando contra gravação real + mock.
- Cada **tool** novo: teste de schema validation + execução mockada.

### Prior art
- Vitest já é o runner padrão.
- Usar `@agentskit/adapters` teste existente como template.
- E2E com Playwright pra componentes React/Ink e devtools extension.

### Skills/Tools (asset marketplace)
- Cada skill publicado deve vir com **golden dataset** (10-50 exemplos input/expected) rodado no CI do marketplace.

---

## Out of Scope (pra esse documento master)

- **Priorização final detalhada** (impacto × esforço × diferenciação) — sai em documento/issue separado quando cada fase começar.
- **Pricing do Cloud** — definido mais perto da Fase 4.
- **Go-to-market e marketing** — complementar, não PRD técnico.
- **Implementação de Python SDK** — AgentsKit é JS-first; Python fica fora.
- **Treinamento de modelos próprios** — AgentsKit é layer de integração, não foundation model.
- **Hosting de modelos** — delegado a providers (OpenRouter, Together, etc.).

---

## Further Notes

### Como este doc vira issues
Cada user story (1-97) deve virar **1 issue GitHub** com:
- Título: "`[Fase X] Story NN — <resumo>`"
- Label: `phase-1-foundation` | `phase-2-evolution` | `phase-3-expansion` | `phase-4-business`
- Label de pacote: `pkg:core`, `pkg:adapters`, `pkg:react`, etc.
- Label de tipo: `type:feature`, `type:dx`, `type:docs`, `type:tool`, `type:adapter`, `type:infra`.
- Link de volta pra esse PRD.

Stories grandes (ex: #54 MCP bridge, #77 AgentsKit Edge, #84 agentskit flow) viram **epics** com sub-issues.

### Apostas estratégicas (se precisar cortar)
Se tudo mais falhar, estas 3 apostas são o mínimo pra AgentsKit se diferenciar:
1. **Deterministic replay + prompt diff + time travel debug** (stories 21-24) — narrativa "finalmente dá pra debugar agentes".
2. **AgentsKit Edge** (story 77) — território vazio, Vercel AI SDK não cobre bem.
3. **MCP bridge bidirecional + A2A Protocol** (stories 54, 81-83) — AgentsKit como camada de interop.

### Princípios não-negociáveis (já no CLAUDE.md)
- Core <10KB gzip, zero deps.
- Todo package plug-and-play.
- Interop total entre packages.
- Named exports only, no default exports.
- TypeScript strict, sem `any`.
