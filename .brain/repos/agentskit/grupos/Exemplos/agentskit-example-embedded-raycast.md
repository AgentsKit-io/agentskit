---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; pnpm indisponível, comandos não executados; auditado em 2026-10-16"
fontes:
  - "apps/example-embedded/raycast/package.json"
  - "apps/example-embedded/raycast/agentskit-ask.js"
  - "apps/example-embedded/README.md"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-embedded-raycast

> [!tldr] Em linguagem comum
> Host do Raycast para o exemplo embedded: um script que recebe a pergunta do usuário, roda o runtime do AgentsKit e mostra a resposta.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Script Command do Raycast (`apps/example-embedded/raycast/agentskit-ask.js`). Recebe o texto da pergunta pelos argumentos do processo, monta o runtime (`createRuntime`, linha 48) com o adapter OpenAI e escreve a resposta. Sem `OPENAI_API_KEY`, responde com um texto de demonstração (`apps/example-embedded/raycast/agentskit-ask.js:32`).

É um host subordinado ao exemplo embedded, com `package.json` próprio em `raycast/`. O README diz que ele não depende das faixas `workspace:*` do monorepo (`apps/example-embedded/README.md:43`). Por isso, o comando de lint do pacote embedded não cobre este host.

## API e contratos

Não exporta API. Entrada: argumentos do processo. Linha de referência: `const prompt = process.argv.slice(2).join(' ').trim()` (`apps/example-embedded/raycast/agentskit-ask.js:42`).

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `prompt` | string | Texto da pergunta, vindo dos argumentos do processo. | `apps/example-embedded/raycast/agentskit-ask.js:42` |

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/runtime` (`apps/example-embedded/raycast/agentskit-ask.js:23`) e `@agentskit/adapters` (`:24`) |
| Pai | [[agentskit-example-embedded]] |

## Dados e efeitos

- `OPENAI_API_KEY` (`apps/example-embedded/raycast/agentskit-ask.js:27`) e `OPENAI_MODEL` (`:39`, padrão `gpt-4o-mini`). A mensagem de demonstração orienta a configurar a chave nas extensões do Raycast (`:32`).
- Rede: chama o provedor OpenAI quando a chave está definida.
- Não grava dados próprios.

## Como mexer (para agentes)

- **Comece por:** `apps/example-embedded/raycast/agentskit-ask.js`.
- **Testes:** nenhum teste específico do host.
- **Validação:** o host tem `package.json` próprio, fora do `pnpm --filter @agentskit/example-embedded`. Verifique o manifesto de `raycast/` antes de declarar validação.
- **Armadilha:** não embutir chaves no script nem na distribuição; a chave vem do ambiente do Raycast.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o host.

## Decisões e história

- ADR específico do host: não identificado.
- Histórico segue o diretório `apps/example-embedded` (ver [[agentskit-example-embedded]]).

> [!info]- Detalhe técnico
> - `apps/example-embedded/raycast/package.json:1` — manifesto próprio do host.
> - `apps/example-embedded/raycast/agentskit-ask.js:23-24` — imports do runtime e do adapter.
> - `apps/example-embedded/raycast/agentskit-ask.js:42` — leitura da pergunta.
> - `apps/example-embedded/raycast/agentskit-ask.js:48` — `createRuntime`.
