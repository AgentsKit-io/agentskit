---
tipo: fluxo
repo: agentskit
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: "análise estática; índice .doc-bridge consultado; pnpm indisponível"
fontes: ["agentskit/packages/cli/src/registry.ts"]
tags: [fluxo, repo/agentskit, camada/framework]
---

# AgentsKit - Copiar agente do Registry

> [!tldr] Em linguagem comum
> O desenvolvedor escolhe um agente pronto e o CLI copia seu código para o projeto. Depois da cópia, o time pode ler e adaptar os arquivos sem depender de um runtime Registry.

← [[00 Hub - agentskit]]

```mermaid
flowchart LR
  C[Bundle Registry] --> F[CLI fetchAgent]
  F --> V[Valida destino e conflitos]
  V --> W[Escreve fontes locais]
  W --> R[Revisão e adaptação pelo time]
```

## Passo a passo

| Passo | O que acontece | Quem atua |
|---|---|---|
| Catálogo | Fornece metadados e arquivos empacotados. | [[00 Hub - agentskit-registry]] |
| CLI | Busca bundle hospedado; há fallback para fontes GitHub. | [[agentskit-cli]] |
| Checagem | Confere agente instalável, caminhos e conflitos antes de escrever. | [[agentskit-cli]] |
| Projeto | Recebe fontes em agents/<id>; o desenvolvedor escolhe dependências e provedor. | [[agentskit-runtime]] |

## Limites e dados

A pré-checagem evita deixar uma instalação pela metade por conflito de destino conhecido. As escritas são sequenciais: a função não implementa rollback de falha de disco durante a gravação. Portanto, a palavra “transactional” dos docs do Registry não deve ser interpretada como uma transação de filesystem com rollback garantido.

> [!info]- Detalhe técnico
> - `agentskit/packages/cli/src/registry.ts:142` — fetchAgent e fallback
> - `agentskit/packages/cli/src/registry.ts:225` — addAgent: destinos e gravação
> - `agentskit/packages/cli/src/registry.ts:242` — pré-checagem de todos os arquivos antes da primeira escrita
