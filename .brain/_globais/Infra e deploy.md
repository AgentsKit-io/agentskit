---
tipo: conceito
verificado-em: 2026-10-16
commits:
  ".github": e921ea2
  "agents-playbook": ea29444
  "agentskit": 779aa601
  "agentskit-chat": 8aeeffd
  "agentskit-os": c3c88d188
  "agentskit-registry": 49952c7
  "ak-admin": 2231015
  "ak-cloud": 15e447a
  "ak-desktop": 40397fa
  "alexandria": 093f07c
  "code-review": 4f37050
  "doc-bridge": ca2c233
  "ecosystem-distribution-ops": 7e138d0
  "fleet": 5f488da
  "harness": 724aa82
  "infra": 3464d81
  "law-os": 371860a
  "marketing-os": f5a853b
  "skills": 56d6dc2
fontes:
  - "agents-playbook/packages/playbook/gate-manifest.json"
  - "agents-playbook/scripts/sync-playbook-package.mjs"
  - "agents-playbook/lib/discovery.ts"
  - "agents-playbook/wrangler.jsonc"
  - "agents-playbook/.github/workflows/ci.yml"
  - "agentskit-chat/README.md"
  - "agentskit-chat/pnpm-workspace.yaml"
  - "agentskit-chat/packages/chat/package.json"
  - "agentskit-chat/scripts/assemble-chat-package.mjs"
  - "agentskit-chat/packages/server/src/index.ts"
  - "agentskit-chat/docs/architecture/overview.md"
  - "agentskit-chat/apps/docs/wrangler.jsonc"
  - "agentskit-os/pnpm-workspace.yaml"
  - "agentskit-os/package.json"
  - "agentskit-os/README.md"
  - "agentskit-registry/README.md"
  - "agentskit-registry/docs/architecture.md"
  - "agentskit-registry/package.json"
  - "agentskit-registry/scripts/build-registry.mjs"
  - "agentskit-registry/scripts/build-discovery.mjs"
  - "agentskit-registry/action.yml"
  - "agentskit/README.md"
  - "agentskit/pnpm-workspace.yaml"
  - "agentskit/packages/core/src/index.ts"
  - "agentskit/packages/runtime/src/index.ts"
  - "agentskit/apps/registry/README.md"
  - "agentskit/railway.json"
  - "agentskit/package.json"
  - "ak-admin/apps/admin/lib/stores.ts"
  - "ak-admin/apps/admin/lib/build-dispatcher.ts"
  - "ak-admin/apps/admin/app/api/published-config/[tenantId]/route.ts"
  - "ak-admin/apps/license-service/bin/server.mjs"
  - "ak-admin/apps/license-service/src/saga/provisioning.ts"
  - "ak-admin/tests/admin-uat/playwright.config.ts"
  - "ak-cloud/apps/cloud/bin/server.mjs"
  - "ak-cloud/apps/cloud/src/api/request-context.ts"
  - "ak-desktop/apps/desktop/src/main.tsx"
  - "ak-desktop/apps/desktop/src/boot/preflight.ts"
  - "ak-desktop/apps/desktop/src-tauri/src/sidecar.rs"
  - "ak-desktop/apps/desktop/src-tauri/tauri.conf.json"
  - "ak-desktop/.github/workflows/desktop-release.yml"
  - "alexandria/apps/github-app/src/ports.ts"
  - "alexandria/packages/engine-runner/src/index.ts"
  - "alexandria/workers/waitlist/src/store.ts"
  - "alexandria/workers/waitlist/wrangler.toml"
  - "alexandria/docs/adr/0001-phase-2-scope.md"
  - "alexandria/docs/adr/0004-key-custody-envelope-encryption.md"
  - "doc-bridge/package.json"
  - "doc-bridge/src/index-builder/build-index.ts"
  - "doc-bridge/src/index.ts"
  - "doc-bridge/wrangler.toml"
  - "doc-bridge/src/fixes/regions.ts"
  - "ecosystem-distribution-ops/src/core.mjs"
  - "ecosystem-distribution-ops/src/ledger.mjs"
  - "ecosystem-distribution-ops/src/operator-review-loop.mjs"
  - "ecosystem-distribution-ops/.github/workflows/publish-docbridge-mcp.yml"
  - "ecosystem-distribution-ops/package.json"
  - ".github/.github/workflows/self-test.yml"
  - ".github/.github/workflows/audit.yml"
  - ".github/.github/scripts/pnpm-bulk-audit.mjs"
  - ".github/default.json"
  - ".github/renovate.json"
  - ".github/.github/PULL_REQUEST_TEMPLATE.md"
  - "law-os/apps/law-os/backend/compose.mjs"
  - "law-os/apps/law-os/backend/worker/entry.mjs"
  - "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"
  - "law-os/apps/law-os-account/src/api/http.ts"
  - "marketing-os/README.md"
  - "marketing-os/apps/marketing-os/package.json"
  - "marketing-os/apps/marketing-os/cloud/wrangler.jsonc"
  - "marketing-os/apps/marketing-os/backend/src/moss/services/dispatch.mjs"
  - "marketing-os/apps/marketing-os/backend/src/moss/services/newsletter-handoff.mjs"
metodo: consolidação documental e análise estática local; sem execução dos produtos
---

# Infra e deploy

> [!tldr] Em linguagem comum
> Onde o código pode rodar e como é distribuído, com o limite entre configuração e operação real.

← [[00 Hub - Ecossistema AgentsKit]]

## Política de runners

A política pretendida para repositórios privados usa o workflow organizacional **pick-runner**: gastar primeiro os minutos incluídos do GitHub e depois selecionar Depot. Repositórios públicos continuam com runners hospedados gratuitos. **Em PR, ainda não mesclado:** [`.github#6`](https://github.com/AgentsKit-io/.github/pull/6), branch `EmersonBraun/ci-pick-runner`, commit `7e52cd0`, fonte `docs/pick-runner.md`. O checkout `main` abaixo ainda está em `e921ea2`; a política não é apresentada como rollout concluído.

| Regra proposta | Comportamento |
|---|---|
| Seleção normal | GitHub quando minutos restantes > 100 (franquia padrão 2000); Depot no restante |
| Falha de billing ou token ausente | Avisa e usa Depot; segredo pelo nome ORG_BILLING_TOKEN |
| Override | FORCE_RUNNER / force_runner vence sem consultar billing |
| Variantes | arm pode usar GitHub ARM; 4 e 8 sempre Depot |
| Job seletor | Sempre Depot, timeout de três minutos |
| Contagem | Linux ×1, Windows ×2, macOS ×10; só repos privados |

Callers em PR (informados pelo coordenador, sem execução de Actions): [law-os#216](https://github.com/AgentsKit-io/law-os/pull/216), [marketing-os#171](https://github.com/AgentsKit-io/marketing-os/pull/171), [alexandria#23](https://github.com/AgentsKit-io/alexandria/pull/23), [infra#13](https://github.com/AgentsKit-io/infra/pull/13), [ak-cloud#11](https://github.com/AgentsKit-io/ak-cloud/pull/11). Migrações Blacksmith → Depot em PR: [agentskit-os#6416](https://github.com/AgentsKit-io/agentskit-os/pull/6416), [ak-admin#4](https://github.com/AgentsKit-io/ak-admin/pull/4), [ecosystem-distribution-ops#31](https://github.com/AgentsKit-io/ecosystem-distribution-ops/pull/31). Os runners abaixo descrevem os commits de `main` analisados.

## Por repositório

Configuração versionada indica os caminhos disponíveis; não comprova onde cada instalação recebe tráfego hoje. [[Onde ficam os dados]] trata persistência e [[Dúvidas abertas]] reúne os pontos operacionais.

### .github

- Público; GitHub Actions ubuntu-latest; não há app/package/banco/deploy.
- Self-test: actionlint, CodeQL actions, Scorecard condicional e audit vazio/pulado.
- Dependency review depende de grafo GitHub e não tem chamada real no self-test.
- Arquivo comunitário observado: .github/PULL_REQUEST_TEMPLATE.md. Não há SECURITY, CONTRIBUTING, CODE_OF_CONDUCT ou perfil organizacional neste checkout.
- Preset: segundas, fuso São Paulo, npm mínimo três dias, majors/produção sob revisão; override local desliga todo automerge.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - .github]] em `e921ea2`. Referências: `.github/.github/workflows/self-test.yml:10`, `.github/.github/workflows/audit.yml:35`, `.github/.github/scripts/pnpm-bulk-audit.mjs:46`, `.github/default.json:3`, `.github/renovate.json:6`, `.github/.github/PULL_REQUEST_TEMPLATE.md:1`.

### agents-playbook

- Site Next/Fumadocs, app raiz privado para npm mas repo público.
- Cloudflare OpenNext configurado: Worker + assets, teto CPU 5000 ms. Vercel ainda tem configuração; destino ativo não verificado.
- Pacote @agentskit/playbook 0.1.1 público, Node ≥22, zero dependências runtime.
- Ask padrão usa serviço externo do ecossistema; não há backend Ask implementado neste repo.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - agents-playbook]] em `ea29444`. Referências: `agents-playbook/packages/playbook/gate-manifest.json:1`, `agents-playbook/scripts/sync-playbook-package.mjs:9`, `agents-playbook/lib/discovery.ts:63`, `agents-playbook/wrangler.jsonc:3`, `agents-playbook/.github/workflows/ci.yml:17`.

### agentskit

- Os pacotes públicos são distribuídos por npm. O README de Registry documenta Vercel para `apps/registry`; os scripts de docs também oferecem Vercel. `railway.json` configura Docker e `/health` para o Ask persistente. O exemplo edge tem configuração Cloudflare Workers. Docs/Registry têm caminhos alternativos vinext/Cloudflare; presença de script não comprova migração do deploy ativo. Cache Ask pode usar Redis Railway ou Upstash. Nenhuma ligação obrigatória a Neon ou R2 foi encontrada no caminho Ask descrito.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - agentskit]] em `779aa601`. Referências: `agentskit/README.md:43`, `agentskit/pnpm-workspace.yaml:1`, `agentskit/packages/core/src/index.ts:1`, `agentskit/packages/runtime/src/index.ts:1`, `agentskit/apps/registry/README.md:1`, `agentskit/railway.json:1`, `agentskit/package.json:1`.

### agentskit-chat

- A superfície npm declarada é composta por `@agentskit/chat` e `@agentskit/chat-cli`; protocolo, servidor, devtools e renderers são subpaths consolidados. O workflow `docs-deploy.yml` publica o site de docs via Vercel com verificação Playwright antes da promoção. Também há configuração OpenNext/Cloudflare Workers em `apps/docs/wrangler.jsonc`; isso é um caminho disponível, não prova do host atual. Stores e provedores são injetados; o subpath drizzle-pg oferece persistência PostgreSQL, sem obrigar Neon.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - agentskit-chat]] em `8aeeffd`. Referências: `agentskit-chat/README.md:1`, `agentskit-chat/pnpm-workspace.yaml:1`, `agentskit-chat/packages/chat/package.json:1`, `agentskit-chat/scripts/assemble-chat-package.mjs:7`, `agentskit-chat/packages/server/src/index.ts:96`, `agentskit-chat/docs/architecture/overview.md:1`, `agentskit-chat/apps/docs/wrangler.jsonc:1`.

### agentskit-os

- Registry de pacotes do tier: GitHub Packages; nomes no fonte ainda podem usar `@agentskit`, remapeados para `@agentskit-io` pela publicação (ADR-0189).
- Imagem do sidecar: GHCR, build Linux amd64; `build-sidecar-image.yml` atende push filtrado em main e acionamento manual.
- Exemplos Kubernetes/ArgoCD/Vault e decisões de isolamento ficam neste repo; o estado real da infraestrutura precisa ser conferido no [[00 Hub - infra]].
- Node local/self-host mantém acesso a disco e processos. Produtos separados detêm seus manifests e deploys, inclusive Railway quando aplicável.
- Workers: Hono, SQLite de Durable Object, R2 e Hyperdrive/Postgres. Nomes de bindings incluem `AKOS_INSTALLATION`, `AKOS_BLOB_BUCKET` e `HYPERDRIVE`; nenhum valor secreto foi lido para esta nota.
- O runtime pode transmitir prompts e documentos ao provedor de IA/embedding escolhido; “local-first” não garante ausência de transmissão externa.
- Runners majoritários Blacksmith Ubuntu; matriz macOS/Windows também Blacksmith; publicação e ci-min incluem runner local self-hosted.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - agentskit-os]] em `c3c88d188`. Referências: `agentskit-os/pnpm-workspace.yaml:1`, `agentskit-os/packages/os-headless-workers/src/bindings.ts:20`, `agentskit-os/packages/os-collab/src/index.ts:47`, `agentskit-os/packages/os-bot-signal/src/index.ts:23`, `agentskit-os/.github/workflows/build-sidecar-image.yml:16`.

### agentskit-registry

- Os artefatos versionados ficam em `public/r`, `public/deterministic` e arquivos llms. O site consumidor é [[agentskit-registry]] em [[00 Hub - agentskit]], com deploy Vercel documentado naquele repo. O build declara endereços públicos em registry.agentskit.io/r; o mecanismo que transporta estes dados até produção não está demonstrado por configuração de deploy deste repositório. Não há banco, Railway, Neon ou R2 obrigatórios para gerar o catálogo.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - agentskit-registry]] em `49952c7`. Referências: `agentskit-registry/README.md:1`, `agentskit-registry/docs/architecture.md:21`, `agentskit-registry/package.json:1`, `agentskit-registry/scripts/build-registry.mjs:47`, `agentskit-registry/scripts/build-discovery.mjs:13`, `agentskit-registry/action.yml:15`.

### ak-admin

- Admin Next, porta local 3041; store Postgres quando configurado, memória para alguns fallbacks e SQLite para diretório local.
- License-service Node com Dockerfile e Postgres obrigatório; migrações antes de aceitar tráfego.
- Não há prova neste repo de host atual nem de CDN operacional. Dispatcher produtivo precisa ser injetado; local assina bytes sintéticos.
- CI principal self-hosted, suítes de navegador opcionais em Blacksmith; variáveis de Actions não consultadas.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - ak-admin]] em `2231015`. Referências: `ak-admin/apps/admin/lib/stores.ts:44`, `ak-admin/apps/admin/lib/build-dispatcher.ts:85`, `ak-admin/apps/admin/app/api/published-config/[tenantId]/route.ts:21`, `ak-admin/apps/license-service/bin/server.mjs:114`, `ak-admin/apps/license-service/src/saga/provisioning.ts:73`, `ak-admin/tests/admin-uat/playwright.config.ts:24`.

### ak-cloud

- Serviço HTTP Node com Dockerfile; imagem HML publicada por workflow manual no GHCR. Destino de execução atual não demonstrado.
- Postgres aplica migrações no boot; vault prefere Postgres, SQLite é alternativa. Redis, R2, Sentry, PostHog e Resend são condicionados ao ambiente.
- Tier privado rc.8 via GitHub Packages; CI principal self-hosted `akos-local`, teste de orçamento em Ubuntu; Okta opcional Blacksmith.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - ak-cloud]] em `15e447a`. Referências: `ak-cloud/apps/cloud/bin/server.mjs:159`, `ak-cloud/apps/cloud/bin/server.mjs:625`, `ak-cloud/apps/cloud/bin/server.mjs:655`, `ak-cloud/apps/cloud/bin/server.mjs:740`, `ak-cloud/apps/cloud/src/api/request-context.ts:103`.

### ak-desktop

- Aplicação local Tauri/Rust + React/Vite + Node sidecar; tier rc.8 privado via GitHub Packages.
- Updater possui endpoint configurado e placeholder de chave pública; release injeta a chave. Estado do serviço remoto não inspecionado.
- Matriz de releases macOS ARM/Intel, Ubuntu e Windows; GitHub Releases, artefatos, SBOM e proveniência declarados nos workflows.
- CI base e gate em self-hosted `akos-local`; releases/OEM/rebrand opcionais por variável do repositório.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - ak-desktop]] em `40397fa`. Referências: `ak-desktop/apps/desktop/src/main.tsx:9`, `ak-desktop/apps/desktop/src/boot/preflight.ts:109`, `ak-desktop/apps/desktop/src-tauri/src/sidecar.rs:255`, `ak-desktop/apps/desktop/src-tauri/tauri.conf.json:1`, `ak-desktop/.github/workflows/desktop-release.yml:19`.

### alexandria

- Privado/proprietário; Workers e D1 no código da waitlist, database_id placeholder.
- Github-app não declara D1/queue/R2 bindings; R2/Containers/registro D1 pertencem ao plano do ADR-0001.
- Waitlist guarda email em claro + hash único, repo opcional, consentimento e origem; rate limit guarda hash com salt diário, não IP bruto.
- CI ubuntu-24.04: tipos/testes/dry-run, sem deploy.
- ADR-0004 propõe envelope encryption por organização; não é custódia implementada.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - alexandria]] em `093f07c`. Referências: `alexandria/apps/github-app/src/ports.ts:64`, `alexandria/packages/engine-runner/src/index.ts:81`, `alexandria/workers/waitlist/src/store.ts:7`, `alexandria/workers/waitlist/wrangler.toml:16`, `alexandria/docs/adr/0001-phase-2-scope.md:23`, `alexandria/docs/adr/0004-key-custody-envelope-encryption.md:17`.

### code-review

- CLI Node 20+ e Action composta; fontes podem ir ao provedor configurado.
- Estado/checkpoints/cache e feedback são separados de conhecimento aprovado.
- npm público por OIDC; docs exportáveis via Wrangler.
- CI, release, publish, CodeQL, dependency-review e scorecard; não confundir definição do workflow com execução aprovada no commit.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - code-review]] em `4f37050`. Consulte os caminhos citados nas notas do repositório.

### doc-bridge

- Pacote público npm; CLI/MCP local ou CI; MCPB/plugins empacotam o mesmo motor.
- Portal: export Next em apps/docs/out; Cloudflare static assets configurado e GitHub Pages automatizado. Vercel possui configuração remanescente.
- Dados locais: índice/capabilities/snapshots/propostas sob configuração .doc-bridge; sem banco hospedado obrigatório.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - doc-bridge]] em `ca2c233`. Referências: `doc-bridge/package.json:2`, `doc-bridge/src/index-builder/build-index.ts:169`, `doc-bridge/src/index.ts:1036`, `doc-bridge/wrangler.toml:1`, `doc-bridge/src/fixes/regions.ts:99`.

### ecosystem-distribution-ops

- Privado; CLI Node/ESM, filesystem local, gh/HTTP conforme comando, sem serviço persistente declarado.
- Origem de estado: ledger/events.ndjson; data/state.json e reports são derivados.
- Único workflow: publicação manual Doc Bridge MCP 2.0.0 em Blacksmith Ubuntu 24.04, GitHub OIDC e publisher fixado.
- Pesquisa Grok pode usar web pública; caminhos padrão dos demais contratos intelligence descritos no README usam fixtures/providers determinísticos.
- Geração de roadmap pré-seed não envia candidatura nem material confidencial.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - ecosystem-distribution-ops]] em `7e138d0`. Referências: `ecosystem-distribution-ops/src/core.mjs:176`, `ecosystem-distribution-ops/src/ledger.mjs:26`, `ecosystem-distribution-ops/src/operator-review-loop.mjs:290`, `ecosystem-distribution-ops/.github/workflows/publish-docbridge-mcp.yml:13`, `ecosystem-distribution-ops/package.json:1`.

### fleet

- Hosts Linux rootless e rede privada Tailscale; Orca headless e CLIProxyAPI.
- Estado de coordenador e ledger no computador do operador; tickets/worktrees no host; OAuth/administração no proxy.
- Não foi identificado workflow GitHub Actions versionado.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - fleet]] em `5f488da`. Consulte os caminhos citados nas notas do repositório.

### harness

- Runtime Node 22 local; .ak-loop/ guarda contratos, eventos e artefatos do loop.
- Orca ou runner local git/tmux/crontab; não presumir daemon SaaS.
- Docs exportadas apps/docs/out e Wrangler assets; configuração Vercel coexistente.
- CI Ubuntu e matriz de loop Ubuntu/macOS/Windows; npm Trusted Publishing condicionado aos gates.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - harness]] em `724aa82`. Consulte os caminhos citados nas notas do repositório.

### infra

- Cloudflare DNS, Pages, Access e R2; Neon São Paulo/Postgres 18 na stack jurídica.
- Estado R2 criptografado no bucket externo com prefixo agentskit/<stack>.tfstate.
- Registry Worker em npm.agentskit.io; READ_TOKEN e PUBLISH_TOKEN são segredos de Worker, nunca valores no vault.
- Wrangler cuida dos scripts/domínios de Worker; OpenTofu cuida dos recursos declarados.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - infra]] em `3464d81`. Consulte os caminhos citados nas notas do repositório.

### law-os

- [[law-os]] e [[law-os-account]]: bundles Vite servidos em Cloudflare Pages; conta tem superfície pública e produto é privado.
- [[bff-worker]]: Cloudflare Worker, Access, JWT ES256 curto; fallback bearer legado documentado no código.
- [[law-os-backend]]: Docker Node/Railway, volume /data, Postgres Neon e R2; imagem privada em GHCR.
- [[law-os-backend-worker-tools]]: caminho HML com backend Worker, Durable Object por instalação, Hyperdrive para Neon e vetores pgvector, binding R2.
- Tier @agentskit-io/*: npm.agentskit.io; build Docker exige mount secreto npmrc; runtime usa nomes de variáveis e bindings, nunca valores no vault.
- Provedor de IA recebe conteúdo necessário à tarefa; jurisprudencias.ai recebe os termos da pesquisa externa. Revisão de contratos não faz envio externo de documento final.
- CI principal/smoke/imagem: self-hosted akos-local; HML acrescenta macOS ARM64; demo/early-access/Access/notificações: Ubuntu hospedado; launcher: Linux/macOS/Windows.
- Backup, retenção e restore por ambiente não foram inspecionados. Ver [[Onde ficam os dados - law-os]].

> [!info]- Detalhe técnico
> Origem: [[00 Hub - law-os]] em `371860a`. Referências: `apps/law-os/backend/compose.mjs:53`, `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/entry.mjs:1`, `apps/law-os/backend/worker/features.mjs:1`, `apps/law-os/backend/opinion-validate.mjs:354`, `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:45`, `apps/law-os-account/src/api/http.ts:74`.

### marketing-os

- Repositório privado: metadado GitHub `private: true` consultado em 2026-10-16; manifests do produto também privados.
- [[marketing-os-cloud]]: um Worker Cloudflare por instalação, assets do console e backend em processo; Hono, Hyperdrive, R2, Durable Objects, Queues e Oficina.
- Postgres (Neon citado no README), `moss` para domínio atual; `mos` preservado no legado Node. Migração separada no cloud; banco local Docker/Postgres 16.
- R2 bindings `MEDIA`, `UPLOADS`, `BACKUPS`; cron diário 06:17 UTC, janela de dumps de 14 dias. Restauração não foi executada.
- Sem caminho atual de deploy Railway/Pages; Wrangler tem identificadores locais, sem prova de provisionamento remoto.
- Tier de UI privado em GitHub Packages, fixado em `0.1.0-rc.15`; `@agentskit/chat`/`@agentskit/core` aparecem no manifesto, sem concluir que cada dependência declarada atua em todos os fluxos.
- CI principal e smoke em `ubuntu-latest`; launcher em Ubuntu/macOS; smoke manual; coleta de specs na CI comum não roda navegador.
- Provedores de texto selecionáveis: CLI, ponte local, offline, Anthropic ou OpenRouter. Transcrição/imagem têm configuração própria. Não transportar valores de chaves para o vault.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - marketing-os]] em `f5a853b`. Referências: `apps/marketing-os/package.json:28`, `vendor/README.md:1`, `apps/marketing-os/cloud/wrangler.jsonc:9`, `apps/marketing-os/cloud/src/backup.mjs:3`, `apps/marketing-os/backend/src/moss/services/dispatch.mjs:301`, `apps/marketing-os/backend/src/moss/services/newsletter-handoff.mjs:1`, `apps/marketing-os/cloud/src/oficina-env.mjs:16`.

### skills

- Não há serviço hospedado, banco ou publicação npm.
- Snapshots de produto/time em ~/.local/state/; entrada Linear/GitHub e YAML dos produtos.
- link-agents.sh faz links e bloco marcado de política global; --remove desfaz o que é marcado.

> [!info]- Detalhe técnico
> Origem: [[00 Hub - skills]] em `56d6dc2`. Consulte os caminhos citados nas notas do repositório.
