---
tipo: hub
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

# 00 Hub - Ecossistema AgentsKit

> [!tldr] Em linguagem comum
> AgentsKit é um ecossistema para construir e operar trabalho com agentes de IA: o framework aberto fornece as peças básicas, a plataforma privada organiza execução, segurança e interface, os produtos aplicam essas peças a domínios como advocacia e marketing, e as ferramentas e a infraestrutura ajudam a equipe a desenvolver, documentar, distribuir e manter tudo.

```mermaid
flowchart TB
  subgraph l0["Framework OSS"]
    r1["agentskit"]
    r2["agentskit-chat"]
    r4["agentskit-registry"]
  end
  subgraph l1["Plataforma"]
    r3["agentskit-os"]
  end
  subgraph l2["Produtos e superfícies"]
    r16["law-os"]
    r17["marketing-os"]
    r6["ak-cloud"]
    r5["ak-admin"]
    r7["ak-desktop"]
  end
  subgraph l3["Ferramentas"]
    r12["fleet"]
    r14["harness"]
    r9["code-review"]
    r10["doc-bridge"]
    r18["skills"]
    r0["agents-playbook"]
  end
  subgraph l4["Infraestrutura e operação"]
    r15["infra"]
    r13[".github"]
    r11["ecosystem-distribution-ops"]
    r8["alexandria"]
  end
  r16 --> r3
  r17 --> r3
  r6 --> r3
  r5 --> r3
  r7 --> r3
  r3 --> r1
  r2 --> r1
  r4 --> r2
  r14 --> r9
  r14 --> r10
  r8 --> r10
  r18 --> r12
  r15 --> r16
  r0 --> r13
  r11 --> r10
```

O mapa agrupa o papel de leitura, não apenas a camada do frontmatter: ak-* são superfícies da plataforma, fleet é ferramenta de execução e Alexandria ainda é um serviço em preparação. As arestas detalhadas e seus limites estão em [[Mapa de dependências]].

## Os 19 repositórios

| Hub | Visibilidade | Camada | Em uma linha |
|---|---|---|---|
| [[00 Hub - .github]] | publico | infra | É a pasta de regras compartilhadas da organização no GitHub: oferece verificações de segurança reutilizáveis, um modelo de PR e a política de atualização de dependências. |
| [[00 Hub - agents-playbook]] | publico | docs | É o manual de engenharia do time: explica como trabalhar com agentes e oferece verificações prontas para que essas regras não dependam só de memória. |
| [[00 Hub - agentskit]] | publico | ferramenta | É a caixa de peças pública do ecossistema: permite montar agentes de IA, trocar provedores, usar ferramentas e memória e apresentar conversas em diferentes interfaces. Também hospeda os sites de documentação e Registry e o serviço Ask compartilhado. |
| [[00 Hub - agentskit-chat]] | publico | ferramenta | É a camada que transforma as peças do AgentsKit em uma aplicação de conversa consistente. A equipe define comportamento, ações e componentes uma vez e apresenta a experiência na Web, no celular ou no terminal. |
| [[00 Hub - agentskit-os]] | privado | plataforma | É a caixa de peças que transforma agentes de IA em um sistema operável: fluxos, aprovações, histórico, custos, segurança e telas. Law OS, Marketing OS e o desktop montam seus produtos com essas peças; o AgentsKit fornece os motores e integrações por baixo. |
| [[00 Hub - agentskit-registry]] | publico | ferramenta | É o catálogo público de agentes prontos para copiar e adaptar. Guarda código, metadados, testes e evidências; a vitrine fica no monorepo AgentsKit. Depois da instalação, o código pertence ao projeto que o copiou. |
| [[00 Hub - ak-admin]] | privado | plataforma | É a mesa de operação de quem fornece o AgentsKit para outras empresas: configura marca, permissões, catálogos e distribuição, e mantém um serviço que emite licenças assinadas. |
| [[00 Hub - ak-cloud]] | privado | plataforma | É a central hospedada que reconhece usuários e organizações, controla planos e gastos e oferece sincronização e APIs aos produtos. Não é o motor que executa os agentes: esse papel fica no [[os-headless]]. |
| [[00 Hub - ak-desktop]] | privado | plataforma | É o aplicativo instalado no computador para abrir o ambiente AgentsKit. A janela mostra a interface; um processo separado executa o backend e pode continuar trabalhando quando a janela é escondida. |
| [[00 Hub - alexandria]] | privado | produto | É a preparação de um serviço que cuidará da documentação de vários projetos: após mudanças, pretende propor correções em lotes. Hoje há lista de espera, um comparador determinístico e um webhook incompleto; o ciclo hospedado ainda não está ligado. |
| [[00 Hub - code-review]] | publico | ferramenta | Revê mudanças com IA e verifica as suspeitas antes de apresentar um parecer, por terminal ou GitHub Actions. |
| [[00 Hub - doc-bridge]] | publico | ferramenta | É o mapa que ajuda uma pessoa ou agente a encontrar onde mexer num projeto e como conferir a mudança. Também compara documentação com código e prepara correções para revisão; o núcleo funciona sem IA. |
| [[00 Hub - ecosystem-distribution-ops]] | privado | infra | É a mesa de operação que escolhe onde apresentar os produtos AgentsKit, prepara o material e registra o que aconteceu. Agentes podem pesquisar e sugerir; publicar ou enviar exige aprovação humana do conteúdo exato. |
| [[00 Hub - fleet]] | privado | infra | Máquinas privadas que executam tarefas de agentes para a equipe, preservando a revisão e a entrega no computador de quem pediu. |
| [[00 Hub - harness]] | publico | ferramenta | Organiza a esteira de desenvolvimento, da ideia à entrega, exigindo contrato, provas e decisões humanas onde a política pede. |
| [[00 Hub - infra]] | privado | infra | Mantém os recursos de nuvem compartilhados e dos produtos: endereços, proteção de acesso, arquivos e banco. |
| [[00 Hub - law-os]] | privado | produto | É o produto privado da AgentsKit para escritórios de advocacia: reúne casos, documentos e IA assistida, mas mantém o advogado responsável por aprovar o trabalho jurídico. |
| [[00 Hub - marketing-os]] | privado | produto | É a oficina editorial de uma equipe ou agência: reúne o jeito de falar de cada marca, propõe o calendário, ajuda a escrever e desenhar conteúdos e exige revisão antes do envio às redes pelo Buffer. Uma instalação atende um cliente e pode conter várias marcas, com pessoas e permissões diferentes. |
| [[00 Hub - skills]] | privado | ferramenta | Distribui os roteiros internos que ensinam os agentes a acompanhar entregas e usar a frota do time. |

## Por onde começar

| Quem chega | Caminho de leitura |
|---|---|
| Dev novo | [[Glossário]] → [[Mapa de dependências]] → hub do repo → pacote e fluxo → [[Infra e deploy]] |
| PM / produto | [[00 Hub - law-os]] / [[00 Hub - marketing-os]] → fluxos → [[Capacidades não usadas]] → [[Dúvidas abertas]] |
| Agente de IA | Leia AGENTS.md e CONVENTIONS.md → [[Mapa de dependências]] → fontes/commits da nota → execute refresh-brain e check-links antes de propor atualização |

## Mapas globais

| Nota | Para que serve |
|---|---|
| [[Glossário]] | Termos e siglas |
| [[Mapa de dependências]] | Relações e evidências |
| [[Infra e deploy]] | Hosts, distribuição e runners |
| [[Onde ficam os dados]] | Persistência e canais de segredos |
| [[Dúvidas abertas]] | O que ainda exige resposta |
| [[Capacidades não usadas]] | Limites, opções e ausência de chamador no escopo analisado |

> [!info]- Detalhe técnico
> Consolidado dos 19 hubs e materiais globais, nos commits registrados. O vault descreve código e configuração; não certifica deploy, adoção ou funcionamento dos produtos em produção.
