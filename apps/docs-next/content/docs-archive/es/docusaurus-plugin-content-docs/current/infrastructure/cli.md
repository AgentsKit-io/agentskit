---
sidebar_position: 4
---

# CLI

`@agentskit/cli` ofrece comandos de terminal para **chat interactivo** (Ink), **ejecuciones puntuales de agentes** (runtime sin UI) y **proyectos de arranque**. Lee configuración opcional del proyecto desde **`.agentskit.config.json`** mediante [`loadConfig`](../packages/core).

## Cuándo usarlo

- Quieres un **chat rápido en terminal** sin construir una app Ink propia.
- Ejecutas **automatización o CI** con `agentskit run <task>` y flags (no hace falta un archivo de script aparte).
- Arrancas proyectos **React o Ink** con `agentskit init`.

## Instalación

```bash
npm install -g @agentskit/cli
# or
npx @agentskit/cli --help
```

## Archivo de configuración (opcional)

Si existe, `.agentskit.config.json` se fusiona con los valores por defecto (salvo `--no-config`). [`loadConfig`](../packages/core) lo resuelve desde el directorio de trabajo actual.

Los campos habituales incluyen `provider` y `model` por defecto para los comandos chat y run.

## `agentskit chat`

Interfaz de terminal interactiva usando `@agentskit/ink`.

```bash
agentskit chat [options]
```

| Opción | Descripción |
|--------|-------------|
| `--provider <name>` | `demo`, `anthropic`, `openai`, … (por defecto: `demo`) |
| `--model <id>` | Id del modelo para el proveedor |
| `--api-key <key>` | Sobrescribe la clave API basada en variables de entorno |
| `--base-url <url>` | URL base de API personalizada |
| `--system <prompt>` | Prompt del sistema |
| `--memory <path>` | Ruta de archivo para historial respaldado por archivo (por defecto: `.agentskit-history.json`) |
| `--memory-backend <backend>` | `file` (por defecto) o `sqlite` |
| `--tools <list>` | Separados por comas: `web_search`, `filesystem`, `shell` |
| `--skill <list>` | Nombres de skills integrados separados por comas (véase [@agentskit/skills](../agents/skills)) |
| `--no-config` | Omitir `.agentskit.config.json` |

Claves API: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc., según el proveedor.

```bash
agentskit chat --provider anthropic --model claude-sonnet-4-6 --tools web_search
```

## `agentskit run`

Ejecuta una **única tarea** mediante [`createRuntime`](../agents/runtime) e imprime el texto final del asistente en stdout.

```bash
agentskit run <task> [options]
agentskit run --task "Summarize this" [options]
```

| Opción | Descripción |
|--------|-------------|
| `--task <text>` | Cadena de la tarea si no se pasa como primer argumento posicional |
| `--provider`, `--model`, `--api-key`, `--base-url` | Igual que en chat |
| `--tools <list>` | Herramientas separadas por comas |
| `--skill <name>` | Un solo skill |
| `--skills <list>` | Skills separados por comas (compuestos); **mutuamente excluyente** con `--skill` |
| `--memory <path>` | Ruta de persistencia al usar memoria file/sqlite |
| `--memory-backend <backend>` | `file` (por defecto) o `sqlite` |
| `--system-prompt <text>` | Sobrescribe el prompt del sistema por defecto |
| `--max-steps <n>` | Tope ReAct (por defecto: `10`) |
| `--verbose` | Registra eventos del agente en stderr |
| `--pretty` | UI de progreso Ink enriquecida |
| `--no-config` | Omitir el archivo de configuración |

```bash
agentskit run "What is 2+2?" --provider openai --model gpt-4o --verbose
```

**No** existe en la CLI actual el modo `agentskit run ./script.ts` — invoca tus propios puntos de entrada TypeScript con `node`/`tsx` y [`createRuntime`](../agents/runtime).

## `agentskit init`

Genera un proyecto de arranque.

```bash
agentskit init [options]
```

| Opción | Por defecto | Descripción |
|--------|---------|-------------|
| `--template <react\|ink>` | `react` | Stack del arranque |
| `--dir <path>` | `agentskit-starter` | Directorio de salida (resuelto desde cwd) |

```bash
agentskit init --template react --dir my-chat
cd my-chat && npm install && npm run dev
```

## Variables de entorno

| Variable | Uso |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic |
| `OPENAI_API_KEY` | OpenAI |
| `REDIS_URL` | Si conectas memoria Redis en código personalizado (no es la memoria por defecto de la CLI) |

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| `task is required` | Pasa una cadena tras `run` o usa `--task`. |
| `--skill` y `--skills` ambos definidos | La CLI termina con error — usa solo uno. |
| Errores de autenticación del proveedor | Exporta el `*_API_KEY` correcto o pasa `--api-key`. |
| Valores por defecto incorrectos | Revisa `.agentskit.config.json` o pasa `--no-config`. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/cli`) · [Inicio rápido](../getting-started/quick-start) · [Ink](../chat-uis/ink) · [Runtime](../agents/runtime) · [Eval](./eval)
