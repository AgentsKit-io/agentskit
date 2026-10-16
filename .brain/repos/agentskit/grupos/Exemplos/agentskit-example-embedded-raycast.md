---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "inspeção estática no commit 9b31c771; índice Doc Bridge versionado consultado, CLI indisponível porque pnpm não está instalado"
fontes:
  - "apps/example-embedded/raycast/package.json"
  - "apps/example-embedded/raycast/agentskit-ask.js"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-embedded-raycast

> [!tldr] Em linguagem comum
> Host Raycast aninhado que encaminha o texto do usuário para o runtime do exemplo embedded.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

É uma integração host do exemplo embedded, não um workspace pnpm independente. Lê argumentos do processo e constrói runtime em `apps/example-embedded/raycast/agentskit-ask.js:42`.

## API e contratos

Não exporta API npm. O ponto de entrada é script Node local. Exemplo real: `const prompt = process.argv.slice(2).join(' ').trim()` em `apps/example-embedded/raycast/agentskit-ask.js:42`.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `prompt` | argumento de CLI | recebe o texto a consultar | `apps/example-embedded/raycast/agentskit-ask.js:42` |

## Quem usa e do que depende

Parte de [[agentskit-example-embedded]]; compõe [[agentskit-runtime]] e [[agentskit-adapters]]. O manifesto aninhado fixa dependências e runtime Node.

## Dados e efeitos

Lê argumentos CLI e `OPENAI_API_KEY` / `OPENAI_MODEL`; pode chamar provedor remoto. Não declara banco ou gravação própria.

## Como mexer (para agentes)

- Entrada: `apps/example-embedded/raycast/agentskit-ask.js`.
- Invariante: manter host subordinado ao exemplo embedded.
- Testes: nenhum teste específico do host localizado.
- Validação: `pnpm --filter @agentskit/example-embedded lint`.
- Armadilha: não embutir chaves em arquivos ou distribuição do host.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- ADR específico do host não confirmado.
- Histórico segue o diretório `apps/example-embedded`; commits recentes são atualizações de dependências, consulte `git log --oneline -15 -- apps/example-embedded`.

> [!info]- Detalhe técnico
> Manifesto aninhado: `apps/example-embedded/raycast/package.json:1`; leitor de argumento: `apps/example-embedded/raycast/agentskit-ask.js:42`.
