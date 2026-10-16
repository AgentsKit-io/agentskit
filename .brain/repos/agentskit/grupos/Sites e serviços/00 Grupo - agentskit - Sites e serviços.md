---
tipo: grupo
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "inspeção estática; .doc-bridge/index.json versionado consultado; pnpm ausente, índice não atualizado"
fontes:
  - "apps/ask-backend/package.json"
  - "apps/docs-next/package.json"
  - "apps/landing/package.json"
  - "apps/registry/package.json"
  - "apps/visual-react/package.json"
tags: [grupo, repo/agentskit, grupo/sites-e-servicos, camada/ferramenta]
---

# 00 Grupo - agentskit - Sites e serviços

> [!tldr] Em linguagem comum
> Páginas públicas, documentação e serviços web que apresentam AgentsKit e atendem suas propriedades. As notas descrevem os apps declarados neste commit.

← [[00 Hub - agentskit]]

## Para que existe e quem usa

Este grupo organiza as superfícies sites e serviços do monorepo. Consulte cada app para contratos observáveis, efeitos e comandos.

## Partes e fluxos

| Nota | Papel |
|---|---|
| [[agentskit-ask-backend]] | Aplicação deste grupo |
| [[agentskit-docs-next]] | Aplicação deste grupo |
| [[agentskit-landing]] | Aplicação deste grupo |
| [[agentskit-registry]] | Aplicação deste grupo |
| [[agentskit-visual-react]] | Aplicação deste grupo |

> [!info]- Detalhe técnico
> Índice Doc Bridge: `.doc-bridge/index.json` (gerado em 2026-10-12); `doc-bridge.config.json` declara corpus de documentação e CLI.
