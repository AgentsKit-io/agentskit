---
tipo: fluxo
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/runtime/src/runner.ts", "agentskit/packages/core/src/controller.ts"]
tags: [fluxo, repo/agentskit]
---

# AgentsKit - Executar um agente

> [!tldr] Em linguagem comum
> O usuário fornece uma tarefa; o agente consulta o modelo, executa ferramentas permitidas e repete até entregar a resposta ou atingir um limite.

← [[00 Hub - agentskit]]

```mermaid
flowchart LR
  A[Tarefa] --> R[Runtime]
  R --> P[Adaptador e provedor]
  P --> C{Pediu ferramenta?}
  C -- sim --> T[Ferramenta autorizada]
  T --> R
  C -- não --> F[Resposta]
```

## Passo a passo

| Passo | O que acontece | Quem atua |
|---|---|---|
| Aplicação | Escolhe adaptador, ferramentas, instruções e limites. | [[agentskit-runtime]] |
| Laço | Monta mensagens, consome streaming e recolhe chamadas de ferramentas. | [[agentskit-core]] |
| Provedor | Traduz pedido e resposta para a API escolhida. | [[agentskit-adapters]] |
| Ferramentas | Executa chamadas e devolve resultados para o próximo passo. | [[agentskit-tools]] |
| Saída | Retorna conteúdo, mensagens e uso; observadores podem registrar os eventos. | [[agentskit-observability]] |

## Limites e dados

O runner oferece cancelamento e limite de passos; o controlador de chat é outra entrada, consumida pelos bindings. Memória, observadores e ferramentas são opcionais. Os dados enviados ao provedor dependem da composição.

> [!info]- Detalhe técnico
> - `agentskit/packages/runtime/src/runner.ts:96` — createRuntime e limites do laço
> - `agentskit/packages/core/src/controller.ts:27` — controlador de conversa distinto do runner
> - `agentskit/packages/runtime/src/runner.ts:304` — ausência de chamadas de ferramentas encerra o laço
