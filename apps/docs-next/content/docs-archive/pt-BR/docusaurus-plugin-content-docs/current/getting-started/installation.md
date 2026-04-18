---
sidebar_position: 1
---

# Instalação

Instale só o que precisar. Cada pacote pode ser instalado de forma independente.

## Interfaces de chat (React)

```bash
npm install @agentskit/react @agentskit/adapters
```

## Interfaces de chat (terminal)

```bash
npm install @agentskit/ink @agentskit/adapters
```

## Executando agentes

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/tools
```

## Ecossistema completo

```bash
npm install @agentskit/core @agentskit/react @agentskit/adapters @agentskit/runtime @agentskit/tools @agentskit/skills @agentskit/memory
```

## Todos os pacotes

Novo no repositório? **[Comece aqui (60s)](./read-this-first)** → depois a **[Visão geral dos pacotes](../packages/overview)**. Assinaturas da API: [TypeDoc](pathname:///agentskit/api-reference/).

| Pacote | O que faz |
|---------|-------------|
| `@agentskit/core` | Tipos, contratos, primitivas compartilhadas |
| `@agentskit/react` | Hooks React + componentes de UI headless |
| `@agentskit/ink` | Componentes de UI no terminal (Ink) |
| `@agentskit/adapters` | Adaptadores de provedores LLM + embedders |
| `@agentskit/cli` | Comandos de CLI (chat, init, run) |
| `@agentskit/runtime` | Runtime de agente autônomo (loop ReAct) |
| `@agentskit/tools` | Ferramentas embutidas (busca na web, sistema de arquivos, shell) |
| `@agentskit/skills` | Skills embutidas (pesquisador, coder, planejador etc.) |
| `@agentskit/memory` | Backends persistentes (SQLite, Redis, vectra) |
| `@agentskit/rag` | Geração aumentada por recuperação (RAG) |
| `@agentskit/observability` | Logs + tracing (console, LangSmith, OpenTelemetry) |
| `@agentskit/sandbox` | Execução segura de código (E2B) |
| `@agentskit/eval` | Avaliação e benchmark de agentes |
| `@agentskit/templates` | Scaffolding de ferramentas, skills e adaptadores |

## Dependências peer

Pacotes React exigem React 18+:

```bash
npm install react react-dom
```

## Opcional: tema padrão

```tsx
import '@agentskit/react/theme'
```

Usa propriedades CSS customizadas — substitua qualquer token sem ejetar.
