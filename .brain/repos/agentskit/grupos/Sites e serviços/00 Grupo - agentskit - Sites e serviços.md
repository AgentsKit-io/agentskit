---
tipo: grupo
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; .doc-bridge/index.json versionado consultado; pnpm ausente, índice não atualizado; auditado em 2026-10-16"
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
| [[agentskit-ask-backend]] | Serviço de perguntas sobre a documentação, com recuperação e citações; expõe também `/mcp`. |
| [[agentskit-docs-next]] | Site de documentação e referência; publica o corpus para agentes. |
| [[agentskit-landing]] | Página pública de apresentação, com analytics opt-in. |
| [[agentskit-registry]] | Catálogo visual de agentes; consome o Ask pelo widget. |
| [[agentskit-visual-react]] | Galeria de componentes React para comparação visual (Playwright). |

Todos os cinco são workspaces privados (`"private": true`, linha 4 de cada `package.json`). O único consumo interno verificado entre eles é o widget do registry chamando o endpoint do Ask (ver [[agentskit-registry]]).

> [!info]- Detalhe técnico
> Índice Doc Bridge: `.doc-bridge/index.json` (gerado em 2026-10-12); `doc-bridge.config.json` declara corpus de documentação e CLI.
