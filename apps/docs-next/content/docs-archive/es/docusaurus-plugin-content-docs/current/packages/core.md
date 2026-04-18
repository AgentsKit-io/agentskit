---
sidebar_position: 2
title: '@agentskit/core'
description: "Base sin dependencias: tipos, createChatController, primitivas de streaming, ayudas de memoria y utilidades del bucle de agente."
---

# `@agentskit/core`

La **capa de contratos** compartida de AgentsKit: tipos de TypeScript, el controlador de chat sin UI, ayudas de stream y bloques de construcción usados por `@agentskit/react`, `@agentskit/ink`, `@agentskit/runtime` y los adaptadores. **Sin dependencias de runtime de terceros**: mantén este paquete pequeño y estable.

## Cuándo usarlo

- Implementas un **adaptador personalizado**, herramienta, memoria o UI sobre los tipos oficiales.
- Necesitas **`createChatController`** sin React (integraciones avanzadas).
- Quieres entender **mensajes, llamadas a herramientas y fragmentos de stream** en todo el ecosistema.

Normalmente **no** importas `core` directamente en una app React típica salvo por tipos: prefiere [`useChat`](../hooks/use-chat) y [`@agentskit/react`](../chat-uis/react).

## Instalación

```bash
npm install @agentskit/core
```

La mayoría de los paquetes de funciones ya dependen de `core`; lo añades explícitamente al escribir bibliotecas o compartir tipos.

## Exportaciones públicas (resumen)

### Controlador de chat y configuración

| Exportación | Rol |
|--------|------|
| `createChatController` | Máquina de estados sin UI: enviar, stream, herramientas, memoria, skills, retriever |
| Tipos: `ChatConfig`, `ChatController`, `ChatState`, `ChatReturn` | Forma de configuración y del controlador |

El controlador fusiona system prompts, ejecuta recuperación, despacha llamadas a herramientas, persiste vía `ChatMemory` y expone patrones subscribe/update que consumen los paquetes de UI.

### Primitivas y streams

| Exportación | Rol |
|--------|------|
| `buildMessage` | Construir un `Message` tipado |
| `consumeStream` | Impulsar `StreamSource` → fragmentos + finalización |
| `createEventEmitter` | Bus de eventos interno para observadores |
| `executeToolCall` | Ejecutar una herramienta desde un payload `ToolCall` |
| `safeParseArgs` | Analizar argumentos JSON de herramientas de forma segura |
| `createToolLifecycle` | `init` / `dispose` para herramientas |
| `generateId` | IDs estables para mensajes y llamadas |

### Ayudas del bucle de agente

| Exportación | Rol |
|--------|------|
| `buildToolMap` | Mapa nombre → `ToolDefinition` |
| `activateSkills` | Fusionar system prompts de skills y herramientas que aportan los skills |
| `executeSafeTool` | Ejecución protegida (hooks de confirmación, errores) |

### Memoria y RAG (ligero)

| Exportación | Rol |
|--------|------|
| `createInMemoryMemory`, `createLocalStorageMemory`, `createFileMemory` | Memorias sencillas incluidas para pruebas o demos |
| `serializeMessages` / `deserializeMessages` | Ayudas de persistencia |
| `createStaticRetriever`, `formatRetrievedDocuments` | Ayudas de retriever para contexto estático |

Los backends pesados están en [`@agentskit/memory`](../data-layer/memory); almacenes vectoriales y fragmentación en [`@agentskit/rag`](../data-layer/rag).

### Archivo de configuración

| Exportación | Rol |
|--------|------|
| `loadConfig` | Cargar `AgentsKitConfig` del proyecto (CLI / herramientas) |

### Tipos (nivel alto)

`AdapterFactory`, `StreamSource`, `StreamChunk`, `Message`, `ToolDefinition`, `ToolCall`, `SkillDefinition`, `ChatMemory`, `Retriever`, `VectorMemory`, `Observer`, `AgentEvent`, y tipos relacionados — firmas completas en TypeDoc (abajo).

## Ejemplo: inspeccionar tipos en una herramienta personalizada

```ts
import type { ToolDefinition, ToolExecutionContext } from '@agentskit/core'

export const myTool: ToolDefinition = {
  name: 'greet',
  description: 'Greets a user by name.',
  schema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async execute(args: Record<string, unknown>, _ctx: ToolExecutionContext) {
    const name = String(args.name ?? 'world')
    return `Hello, ${name}!`
  },
}
```

## Ejemplo: controlador sin UI (avanzado)

```ts
import { createChatController } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const chat = createChatController({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
})

chat.subscribe(() => {
  console.log(chat.getState().status, chat.getState().messages.length)
})

await chat.send('Hello')
```

En apps React prefiere `useChat`: envuelve este patrón con hooks.

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| Errores de tipos tras actualizar | Fija todos los `@agentskit/*` al mismo semver; los tipos de `core` evolucionan con el ecosistema. |
| `createChatController` frente a `useChat` | El controlador es agnóstico al framework; el hook de React añade el enlace de estado y seguridad en Strict Mode. |
| Preocupación por el tamaño del bundle | Tree-shake de exportaciones no usadas; evita importar utilidades solo de servidor en bundles de cliente. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](./overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/core`) · [React](../chat-uis/react) · [Ink](../chat-uis/ink) · [Adaptadores](../data-layer/adapters) · [Runtime](../agents/runtime) · [Herramientas](../agents/tools) · [Skills](../agents/skills) · [useChat](../hooks/use-chat) · [useStream](../hooks/use-stream) · [useReactive](../hooks/use-reactive)
