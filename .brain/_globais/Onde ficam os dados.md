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

# Onde ficam os dados

> [!tldr] Em linguagem comum
> Um mapa dos lugares que guardam estado, arquivos e credenciais, sem copiar conteúdo de clientes nem valores secretos.

← [[00 Hub - Ecossistema AgentsKit]]

## Mapa de persistência

| Repo | Lugares / nomes declarados | Dados e limites | Detalhe por repo |
|---|---|---|---|
| [[00 Hub - law-os]] | Neon/Postgres; Node /data (SQLite e arquivos); Workers HYPERDRIVE e Durable Object; R2 AKOS_BLOB_BUCKET | Contratos, runs, vetores, decisões e artefatos; distribuição varia pelo host | [[Onde ficam os dados - law-os]] |
| [[00 Hub - marketing-os]] | Postgres schemas moss / mos legado; R2 MEDIA, UPLOADS, BACKUPS; DO HUB, CONVERSA, OFICINA | Marcas, versões, aprovações, conexões Buffer criptografadas, mídia e dumps | [[marketing-os-cloud]] |
| [[00 Hub - agentskit-os]] | Stores injetados: SQLite, Postgres, pgvector, R2/S3; Vault/keychain conforme host | A plataforma define portas e adaptadores; produtos definem configuração e escopo | [[os-headless]] |
| [[00 Hub - ak-cloud]] | Postgres preferencial; SQLite alternativo para vault; Redis/R2 condicionais | Identidade, organizações, direitos, cobrança, snapshots e uso | [[cloud]] |
| [[00 Hub - ak-admin]] | Postgres de licenças e config; SQLite local e fallbacks em memória | Licenças, revogações, tenants, configuração publicada e auditoria | [[admin]] |
| [[00 Hub - ak-desktop]] | Disco local do aplicativo e backend sidecar; serviços cloud opcionais | Configuração, licença e estado de execução local | [[ak-desktop-sidecar]] |
| [[00 Hub - infra]] | R2 de estado OpenTofu, prefixo agentskit/<stack>.tfstate; registry R2 | Estado de infraestrutura e versões/tarballs; não dados jurídicos | [[infra-registry]] |
| [[00 Hub - fleet]] | Filesystem local do coordenador/ledger; worktrees e tickets nos hosts; credenciais no proxy | Fila, leases, commits em bundle e sinais de quota | [[fleet-cli]] |
| [[00 Hub - harness]] | .ak-loop/ no projeto | Contratos, eventos, verificações e artefatos da esteira | [[harness-loop]] |
| [[00 Hub - code-review]] | Stores de checkpoints/cache/feedback e conhecimento aprovado separados | Campanhas e achados; não promover feedback bruto a regra aprovada | [[code-review-memory]] |
| [[00 Hub - doc-bridge]] | .doc-bridge/ conforme configuração; snapshots, índices, overlays | Conhecimento derivado e propostas; sem banco hospedado obrigatório | [[doc-bridge-memoria-vault]] |
| [[00 Hub - alexandria]] | D1 da waitlist com database_id placeholder | Email, hash único, consentimento e repo opcional; ports do app ainda rejeitam | [[alexandria-waitlist]] |
| [[00 Hub - ecosystem-distribution-ops]] | ledger/events.ndjson; data/state.json e reports derivados | Aprovações e recibos; artefatos sensíveis mode-600 fora do fluxo público | [[distribution-ledger]] |
| [[00 Hub - skills]] | ~/.local/state/; YAML de produto; Linear/GitHub como entradas | Snapshots dos relatórios; sem backend próprio | [[product-status]] |
| [[00 Hub - agentskit]] | Stores fornecidos pelo host; Ask pode usar Redis Railway ou Upstash | Primitivas de memória não impõem banco; cache Ask depende do ambiente | [[agentskit-ask-backend]] |
| [[00 Hub - agentskit-chat]] | Stores injetados, opção drizzle-pg/Postgres | Sessões e estado pertencem ao host consumidor | [[chat-server]] |
| [[00 Hub - agentskit-registry]] | public/r, public/deterministic, llms versionados | Bundles e metadados públicos; sem banco obrigatório | [[registry-catalogo]] |
| [[00 Hub - agents-playbook]] | content/docs e discovery com hash | Corpus editorial, não base de clientes | [[agents-playbook-site]] |
| [[00 Hub - .github]] | GitHub Actions / configurações organizacionais | Sem banco próprio; tokens apenas no armazenamento de secrets do GitHub | [[github-org-workflows]] |

## Segredos: só nomes, nunca valores

| Superfície | Canal / nomes | Quem define o acesso |
|---|---|---|
| Actions privados / política em PR | GitHub Actions secrets: ORG_BILLING_TOKEN; variável FORCE_RUNNER | [[Infra e deploy]], [[github-org-workflows]] |
| Build de imagem Law OS | Mount secreto BuildKit npmrc; não ARG/ENV | [[law-os-backend]] |
| Registry npm privado | Worker secrets READ_TOKEN e PUBLISH_TOKEN | [[agentskit-npm-registry]] |
| Worker e produto | Bindings/secrets Cloudflare; instalação via MOS_INSTALL_CONFIG_B64 / MOS_INSTALL_CONFIG_FILE | [[marketing-os-cloud]], [[law-os-backend-worker-tools]] |
| Execução Node e modelos | DATABASE_URL / AKOS_DATABASE_URL, AKOS_PAID_EXECUTION_TOKEN; keychain/vault do host | [[law-os-backend]], [[os-vault]] |
| Frota | OAuth/administração no proxy, credenciais fora do bundle Git | [[fleet-host]], [[fleet-cli]] |
| Infra | Vault e exemplos Kubernetes são opções documentadas, sem prova de configuração ativa | [[00 Hub - infra]], [[os-vault]] |

## Trânsito e recuperação

Texto necessário à tarefa pode ir ao provedor de IA/embeddings configurado. A revisão não envia o parecer ao cliente; a pesquisa jurídica externa envia termos. Snapshots legais ficam em `legal-sources/<jurisdição>/snapshots/` no caminho Node que os provisiona; distribuição no hospedado e atualização continuam perguntas. No MOSS, mídia pode sair para Buffer quando instalação e aprovação permitem. Retenção, região, restore e isolamento efetivo exigem evidência operacional específica; não foram exercitados aqui.

O levantamento antigo do piloto citava `agentskitos.db`, `rag-vectors.db`, `audit-ledger.jsonl` e `audit-ledger-key.pem` em `/data`, e PDF como data-URI no Postgres. São nomes úteis para investigar o **Node**, sem transportá-los ao Worker nem garantir persistência de HITL. Use [[Onde ficam os dados - law-os]] e [[Dúvidas abertas]] para o estado documental atual.

> [!info]- Detalhe técnico
> O mapa consolida as notas vinculadas e os hubs nos commits do frontmatter. Não foram consultados bancos, buckets, secrets, backups ou instalações ativas.
