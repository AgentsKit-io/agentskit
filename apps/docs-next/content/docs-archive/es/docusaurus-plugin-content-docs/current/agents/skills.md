---
sidebar_position: 3
---

# Skills

`@agentskit/skills` proporciona cinco valores **`SkillDefinition`** integrados (prompts del sistema + metadatos). Los skills llevan pistas de **`tools`** y **`delegates`** para que el runtime sepa qué herramientas fusionar y qué subagentes preferir durante la delegación.

## Cuándo usarlo

- Quieres **personas con opinión** (investigador, programador, planificador, …) sin escribir a mano prompts largos del sistema.
- Compones personas con **`composeSkills`** para tareas en varias fases.

Los skills personalizados son objetos planos — usa [`@agentskit/templates`](../packages/templates) o define `SkillDefinition` en código.

## Instalación

```bash
npm install @agentskit/skills
```

Los tipos de skill provienen de [`@agentskit/core`](../packages/core).

## Exportaciones públicas

| Exportación | Función |
|--------|------|
| `researcher`, `coder`, `planner`, `critic`, `summarizer` | Objetos `SkillDefinition` integrados |
| `composeSkills(...skills)` | Fusiona prompts, pistas de herramientas y delegados |
| `listSkills()` | `SkillMetadata[]` para UIs de descubrimiento |

## Usar un skill

Pasa un skill a `runtime.run()` mediante la opción `skill`. El `systemPrompt` del skill sustituye el prompt del sistema por defecto, y las herramientas listadas en `skill.tools` se fusionan en el conjunto activo de herramientas.

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher } from '@agentskit/skills'
import { webSearch } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [webSearch()],
})

const result = await runtime.run(
  'What are the trade-offs between Redis and Memcached?',
  { skill: researcher },
)
```

## Skills integrados

### `researcher`

Investigador web metódico que encuentra, contrasta y resume información de varias fuentes.

- **pista de tools:** `['web_search']`
- **delegates:** _(ninguno)_

El investigador descompone preguntas en subconsultas, busca cada una de forma independiente, contrasta fuentes y termina con una evaluación de confianza.

### `coder`

Ingeniero de software que escribe código limpio, probado y listo para producción siguiendo buenas prácticas.

- **pista de tools:** `['read_file', 'write_file', 'list_directory', 'shell']`
- **delegates:** _(ninguno)_

El programador entiende bien los requisitos antes de escribir, maneja casos límite y explica decisiones de diseño clave. Nunca usa tipos `any` ni añade abstracciones no solicitadas.

### `planner`

Planificador estratégico que desglosa tareas complejas en pasos, identifica dependencias y coordina agentes especialistas.

- **pista de tools:** _(ninguna — los delegados hacen el trabajo)_
- **delegates:** `['researcher', 'coder']`

El planificador descompone objetivos en los pasos independientes más pequeños y delega cada paso al especialista correcto. Replanifica cuando un paso falla en lugar de seguir a ciegas.

### `critic`

Revisor constructivo que evalúa el trabajo por corrección, exhaustividad y calidad.

- **pista de tools:** `['read_file']`
- **delegates:** _(ninguno)_

El crítico clasifica problemas por gravedad (crítico / importante / menor), propone correcciones concretas con razonamiento y siempre reconoce lo que funciona bien antes de listar problemas.

### `summarizer`

Resumidor conciso que extrae puntos clave preservando matices y estructura.

- **pista de tools:** _(ninguna)_
- **delegates:** _(ninguno)_

El resumidor adapta la longitud de la salida a la del contenido: una frase para textos cortos, viñetas estructuradas para textos largos. Nunca introduce información que no esté en el original.

## `composeSkills`

Fusiona dos o más skills en uno. El skill resultante concatena todos los prompts del sistema (separados por cabeceras `--- name ---`), deduplica pistas de herramientas y fusiona listas de delegados.

```ts
import { composeSkills, researcher, coder } from '@agentskit/skills'

const fullStackAgent = composeSkills(researcher, coder)

const result = await runtime.run(
  'Research the best TypeScript ORM, then scaffold a basic schema',
  { skill: fullStackAgent },
)
```

El `name` del skill compuesto es `researcher+coder` y su `description` enumera ambos componentes.

```ts
// Throws — at least one skill is required
composeSkills()

// Single skill passthrough — returns the original unchanged
composeSkills(researcher) // === researcher
```

## `listSkills`

Enumera todos los skills integrados y su metadatos — útil para construir UIs de agentes o validar la configuración.

```ts
import { listSkills } from '@agentskit/skills'

const skills = listSkills()
// [
//   { name: 'researcher', description: '...', tools: ['web_search'], delegates: [] },
//   { name: 'coder',      description: '...', tools: ['read_file', 'write_file', 'list_directory', 'shell'], delegates: [] },
//   { name: 'planner',    description: '...', tools: [], delegates: ['researcher', 'coder'] },
//   { name: 'critic',     description: '...', tools: ['read_file'], delegates: [] },
//   { name: 'summarizer', description: '...', tools: [], delegates: [] },
// ]
```

Cada entrada es un objeto `SkillMetadata`:

```ts
interface SkillMetadata {
  name: string
  description: string
  tools: string[]       // Tool names this skill expects to have available
  delegates: string[]   // Sub-agent names this skill will delegate to
}
```

## Traer tu propio skill

Un `SkillDefinition` es un objeto plano — no hace falta clase.

```ts
import type { SkillDefinition } from '@agentskit/core'

export const translator: SkillDefinition = {
  name: 'translator',
  description: 'Translates text between languages accurately and naturally.',
  systemPrompt: `You are a professional translator...`,
  tools: [],
  delegates: [],
}
```

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| El planificador nunca delega | Asegúrate de que el runtime tenga herramientas coincidentes y configuración de delegación de [Delegación](./delegation). |
| Herramientas del skill sin usar | Registra los `ToolDefinition[]` reales (p. ej. `webSearch()`) en `createRuntime`; las pistas solas no instalan herramientas. |
| Prompt compuesto demasiado largo | Recorta los skills de origen o divídelo en ejecuciones separadas. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/skills`) · [Runtime](./runtime) · [Delegación](./delegation) · [Herramientas](./tools) · [@agentskit/core](../packages/core)
