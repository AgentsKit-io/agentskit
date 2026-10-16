---
tipo: app
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/apps/example-embedded/raycast/package.json", "agentskit/apps/example-embedded/src/index.ts"]
tags: [app, repo/agentskit]
---

# Raycast do exemplo embedded

> [!tldr] Em linguagem comum
> É a embalagem do exemplo que permite chamar o mesmo agente a partir do Raycast. Não é outro motor nem um workspace pnpm independente.

← [[00 Hub - agentskit]]

| Relação | Peça |
|---|---|
| Faz parte do exemplo | [[agentskit-example-embedded]] |
| Executa agente | [[agentskit-runtime]] |
| Contratos e provedor | [[agentskit-core]], [[agentskit-adapters]] |

O manifesto é privado e ESM, com Node 20+ e versões npm fixadas. Lê a entrada do usuário e usa o mesmo formato de execução do exemplo embedded. As credenciais são configuração do ambiente, nunca parte das notas. Não há script npm de deploy nem banco próprio no manifesto.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-embedded/raycast/package.json:1` — pacote auxiliar dentro de um app; o glob apps/* não o torna workspace.
> - `agentskit/apps/example-embedded/src/index.ts:1` — entrada canônica e descrição dos hosts.
