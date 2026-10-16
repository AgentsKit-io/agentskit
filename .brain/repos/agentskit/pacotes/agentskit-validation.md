---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/validation/package.json", "agentskit/packages/validation/src/index.ts", "agentskit/packages/validation/src/ajv-validator.ts"]
tags: [pacote, repo/agentskit]
---

# @agentskit/validation

> [!tldr] Em linguagem comum
> Confere se os argumentos de ferramentas obedecem ao JSON Schema esperado, quando a aplicação liga o validador Ajv.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-core]], `ajv` |
| Usado por (produção/peer nestes dois repos) | [[chat-example-shared]] |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Subpaths do manifesto: `.`.

## Dados que entram e saem

Lê schemas e argumentos; devolve erros de validação. Não persiste conversas.

> [!info]- Detalhe técnico
> - `agentskit/packages/validation/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/packages/validation/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/validation/src/ajv-validator.ts:86`.
