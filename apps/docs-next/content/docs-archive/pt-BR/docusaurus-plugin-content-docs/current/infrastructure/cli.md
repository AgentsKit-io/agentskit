---
sidebar_position: 4
---

# CLI

`@agentskit/cli` fornece comandos de terminal para **chat interativo** (Ink), **execuções pontuais de agente** (runtime headless) e **projetos iniciais**. Lê configuração opcional do projeto em **`.agentskit.config.json`** via [`loadConfig`](../packages/core).

## Quando usar

- Você quer um **chat rápido no terminal** sem montar um app Ink customizado.
- Você roda **automação ou CI** com `agentskit run <task>` e flags (sem arquivo de script separado).
- Você inicializa starters **React ou Ink** com `agentskit init`.

## Instalação

```bash
npm install -g @agentskit/cli
# or
npx @agentskit/cli --help
```

## Arquivo de configuração (opcional)

Se existir, `.agentskit.config.json` é mesclado aos padrões (salvo `--no-config`). [`loadConfig`](../packages/core) resolve a partir do diretório de trabalho atual.

Campos típicos incluem `provider` e `model` padrão para os comandos chat e run.

## `agentskit chat`

Interface de terminal interativa usando `@agentskit/ink`.

```bash
agentskit chat [options]
```

| Opção | Descrição |
|--------|-------------|
| `--provider <name>` | `demo`, `anthropic`, `openai`, … (padrão: `demo`) |
| `--model <id>` | Id do modelo para o provedor |
| `--api-key <key>` | Sobrescreve chave de API baseada em env |
| `--base-url <url>` | URL base customizada da API |
| `--system <prompt>` | System prompt |
| `--memory <path>` | Caminho de arquivo para histórico em arquivo (padrão: `.agentskit-history.json`) |
| `--memory-backend <backend>` | `file` (padrão) ou `sqlite` |
| `--tools <list>` | Separado por vírgula: `web_search`, `filesystem`, `shell` |
| `--skill <list>` | Nomes de skills embutidas separados por vírgula (veja [@agentskit/skills](../agents/skills)) |
| `--no-config` | Ignora `.agentskit.config.json` |

Chaves de API: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` etc., conforme o provedor.

```bash
agentskit chat --provider anthropic --model claude-sonnet-4-6 --tools web_search
```

## `agentskit run`

Executa uma **única tarefa** via [`createRuntime`](../agents/runtime) e imprime o texto final do assistente em stdout.

```bash
agentskit run <task> [options]
agentskit run --task "Summarize this" [options]
```

| Opção | Descrição |
|--------|-------------|
| `--task <text>` | String da tarefa se não for passada como primeiro argumento posicional |
| `--provider`, `--model`, `--api-key`, `--base-url` | Igual ao chat |
| `--tools <list>` | Ferramentas separadas por vírgula |
| `--skill <name>` | Uma skill |
| `--skills <list>` | Skills separadas por vírgula (compostas); **mutuamente exclusivo** com `--skill` |
| `--memory <path>` | Caminho de persistência ao usar memória file/sqlite |
| `--memory-backend <backend>` | `file` (padrão) ou `sqlite` |
| `--system-prompt <text>` | Sobrescreve o system prompt padrão |
| `--max-steps <n>` | Teto ReAct (padrão: `10`) |
| `--verbose` | Registra eventos do agente em stderr |
| `--pretty` | UI de progresso rica no Ink |
| `--no-config` | Ignora arquivo de config |

```bash
agentskit run "What is 2+2?" --provider openai --model gpt-4o --verbose
```

**Não** existe modo `agentskit run ./script.ts` na CLI atual — invoque seus próprios entrypoints TypeScript com `node`/`tsx` e [`createRuntime`](../agents/runtime).

## `agentskit init`

Gera um projeto inicial.

```bash
agentskit init [options]
```

| Opção | Padrão | Descrição |
|--------|---------|-------------|
| `--template <react\|ink>` | `react` | Stack do starter |
| `--dir <path>` | `agentskit-starter` | Diretório de saída (resolvido a partir do cwd) |

```bash
agentskit init --template react --dir my-chat
cd my-chat && npm install && npm run dev
```

## Variáveis de ambiente

| Variável | Uso |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic |
| `OPENAI_API_KEY` | OpenAI |
| `REDIS_URL` | Se você ligar memória Redis em código customizado (não é o padrão da CLI com memória em arquivo) |

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| `task is required` | Passe uma string depois de `run` ou use `--task`. |
| `--skill` e `--skills` ambos definidos | A CLI sai com erro — use só um. |
| Erros de autenticação do provedor | Exporte o `*_API_KEY` correto ou passe `--api-key`. |
| Padrões errados | Verifique `.agentskit.config.json` ou passe `--no-config`. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/cli`) · [Início rápido](../getting-started/quick-start) · [Ink](../chat-uis/ink) · [Runtime](../agents/runtime) · [Eval](./eval)
