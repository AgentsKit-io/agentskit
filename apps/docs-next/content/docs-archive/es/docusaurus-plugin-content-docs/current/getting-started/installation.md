---
sidebar_position: 1
---

# Instalación

Instala solo lo que necesites. Cada paquete se puede instalar de forma independiente.

## Interfaces de chat (React)

```bash
npm install @agentskit/react @agentskit/adapters
```

## Interfaces de chat (terminal)

```bash
npm install @agentskit/ink @agentskit/adapters
```

## Ejecución de agentes

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/tools
```

## Ecosistema completo

```bash
npm install @agentskit/core @agentskit/react @agentskit/adapters @agentskit/runtime @agentskit/tools @agentskit/skills @agentskit/memory
```

## Todos los paquetes

¿Nuevo en el repositorio? **[Empieza aquí (60s)](./read-this-first)** → luego la **[Descripción general de paquetes](../packages/overview)**. Firmas de la API: [TypeDoc](pathname:///agentskit/api-reference/).

| Paquete | Qué hace |
|---------|-------------|
| `@agentskit/core` | Tipos, contratos, primitivas compartidas |
| `@agentskit/react` | Hooks de React + componentes de UI sin estilos |
| `@agentskit/ink` | Componentes de UI para terminal (Ink) |
| `@agentskit/adapters` | Adaptadores de proveedores LLM + embedders |
| `@agentskit/cli` | Comandos de CLI (chat, init, run) |
| `@agentskit/runtime` | Runtime de agente independiente (bucle ReAct) |
| `@agentskit/tools` | Herramientas integradas (búsqueda web, sistema de archivos, shell) |
| `@agentskit/skills` | Skills integrados (investigador, programador, planificador, etc.) |
| `@agentskit/memory` | Backends persistentes (SQLite, Redis, vectra) |
| `@agentskit/rag` | Generación aumentada por recuperación |
| `@agentskit/observability` | Registro y trazas (consola, LangSmith, OpenTelemetry) |
| `@agentskit/sandbox` | Ejecución segura de código (E2B) |
| `@agentskit/eval` | Evaluación y benchmarks de agentes |
| `@agentskit/templates` | Andamiaje de herramientas, skills y adaptadores |

## Dependencias entre pares

Los paquetes de React requieren React 18+:

```bash
npm install react react-dom
```

## Opcional: tema por defecto

```tsx
import '@agentskit/react/theme'
```

Usa propiedades personalizadas de CSS: puedes sobrescribir cualquier token sin hacer eject.
