---
sidebar_position: 1
title: Descripción general de paquetes
description: "Los catorce paquetes npm de AgentsKit: propósito, nombres de instalación y enlaces canónicos a la documentación."
---

# Descripción general de paquetes

Catorce paquetes enfocados bajo `@agentskit/*`. Instala lo que necesites; las capas de UI y runtime comparten **`@agentskit/core`** (sin dependencias de terceros en core).

:::tip Referencia de la API

Firmas completas: **[TypeDoc HTML](pathname:///agentskit/api-reference/)** (generado con `pnpm --filter @agentskit/docs build`; en desarrollo local ejecuta `pnpm --filter @agentskit/docs docs:api` una vez).

:::

## Índice de paquetes

| Paquete | Rol | Guía |
|---------|------|--------|
| [`@agentskit/core`](./core) | Tipos, controlador de chat, primitivas, bucle de agente | [Core](./core) |
| [`@agentskit/react`](../chat-uis/react) | Hooks de React + UI sin estilos | [React](../chat-uis/react) |
| [`@agentskit/ink`](../chat-uis/ink) | UI de terminal (Ink) | [Ink](../chat-uis/ink) |
| [`@agentskit/adapters`](../data-layer/adapters) | Adaptadores LLM + embedders | [Adaptadores](../data-layer/adapters) |
| [`@agentskit/memory`](../data-layer/memory) | Backends de chat y vectoriales | [Memoria](../data-layer/memory) |
| [`@agentskit/rag`](../data-layer/rag) | Fragmentar, embeber, recuperar | [RAG](../data-layer/rag) |
| [`@agentskit/runtime`](../agents/runtime) | Runtime ReAct sin UI | [Runtime](../agents/runtime) |
| [`@agentskit/tools`](../agents/tools) | Herramientas de búsqueda, sistema de archivos y shell | [Herramientas](../agents/tools) |
| [`@agentskit/skills`](../agents/skills) | Definiciones de skills integradas | [Skills](../agents/skills) |
| [`@agentskit/observability`](../infrastructure/observability) | Observadores de registro y trazas | [Observabilidad](../infrastructure/observability) |
| [`@agentskit/sandbox`](../infrastructure/sandbox) | Ejecución de código en sandbox | [Sandbox](../infrastructure/sandbox) |
| [`@agentskit/eval`](../infrastructure/eval) | Suites de eval y métricas de CI | [Eval](../infrastructure/eval) |
| [`@agentskit/cli`](../infrastructure/cli) | CLI `agentskit` | [CLI](../infrastructure/cli) |
| [`@agentskit/templates`](./templates) | Andamiaje de herramientas, skills y adaptadores | [Plantillas](./templates) |

Mantenedores: **[lista de comprobación de documentación](../contributing/package-docs)**.
