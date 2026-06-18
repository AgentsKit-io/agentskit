import { defineTool, type ToolDefinition } from '@agentskit/core'

/**
 * Ask-the-docs streaming protocol + generative-UI tool registry.
 *
 * Single source of truth shared by the server route and the React widget. The
 * model calls these "UI tools"; the route does NOT execute them server-side —
 * it forwards each call to the client as a `UiEvent` of type `tool`, and the
 * widget renders it from the component registry (allow-listed + schema-checked).
 * Plain prose streams as `text` events. Retrieval is via the runtime
 * `retriever`, not a tool.
 */

// ── UI tools (schemas the adapter advertises to the model) ──────────────────

export const answerTool = defineTool({
  name: 'answer',
  description: 'Render a markdown answer (supports GitHub-flavored markdown and fenced code).',
  schema: {
    type: 'object',
    properties: { markdown: { type: 'string', description: 'The answer in markdown.' } },
    required: ['markdown'],
    additionalProperties: false,
  } as const,
})

export const citeTool = defineTool({
  name: 'cite',
  description: 'Cite the docs pages the answer is grounded in.',
  schema: {
    type: 'object',
    properties: {
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            path: { type: 'string', description: 'Docs path, e.g. /docs/agents/runtime' },
            anchor: { type: 'string', description: 'Heading anchor without #' },
          },
          required: ['title', 'path'],
          additionalProperties: false,
        },
      },
    },
    required: ['sources'],
    additionalProperties: false,
  } as const,
})

export const showOptionsTool = defineTool({
  name: 'showOptions',
  description: 'Offer the user a few clickable choices to disambiguate or branch.',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: { label: { type: 'string' }, value: { type: 'string' } },
          required: ['label', 'value'],
          additionalProperties: false,
        },
      },
    },
    required: ['prompt', 'options'],
    additionalProperties: false,
  } as const,
})

export const renderFormTool = defineTool({
  name: 'renderForm',
  description: 'Render a small form to collect inputs (e.g. provider/model to try a snippet).',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            type: { type: 'string', enum: ['text', 'password', 'select', 'number'] },
            placeholder: { type: 'string' },
            required: { type: 'boolean' },
            options: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'label', 'type'],
          additionalProperties: false,
        },
      },
      submitLabel: { type: 'string' },
      action: { type: 'string', description: 'Action id the submit triggers (e.g. configAndRun).' },
    },
    required: ['fields', 'submitLabel', 'action'],
    additionalProperties: false,
  } as const,
})

export const codeBlockTool = defineTool({
  name: 'codeBlock',
  description: 'Show a syntax-highlighted code block, optionally runnable in the browser.',
  schema: {
    type: 'object',
    properties: {
      lang: { type: 'string' },
      code: { type: 'string' },
      runnable: { type: 'boolean' },
    },
    required: ['code'],
    additionalProperties: false,
  } as const,
})

export const runExampleTool = defineTool({
  name: 'runExample',
  description: 'Run a JavaScript/TypeScript snippet in the browser sandbox and show the result.',
  schema: {
    type: 'object',
    properties: { code: { type: 'string' } },
    required: ['code'],
    additionalProperties: false,
  } as const,
})

export const openPageTool = defineTool({
  name: 'openPage',
  description: 'Link to a docs page as a card.',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      path: { type: 'string' },
      anchor: { type: 'string' },
    },
    required: ['title', 'path'],
    additionalProperties: false,
  } as const,
})

/**
 * All UI tools advertised to the model. `defineTool` returns invariant
 * per-schema generics; we only need the base `ToolDefinition` shape here (these
 * are never executed server-side), so widen through `unknown`.
 */
// NOTE: `answer` is intentionally NOT advertised. Free models imitate a "answer"
// tool by emitting its JSON as raw text (which then renders as a JSON blob). The
// prose answer is plain streamed markdown text instead; `answerTool` is kept only
// for the server-side off-topic decline event, which the widget still renders.
export const UI_TOOLS: ToolDefinition[] = [
  citeTool,
  showOptionsTool,
  renderFormTool,
  codeBlockTool,
  runExampleTool,
  openPageTool,
] as unknown as ToolDefinition[]

export const UI_TOOL_NAMES = new Set(UI_TOOLS.map((t) => t.name))

export function isUiTool(name: string): boolean {
  return UI_TOOL_NAMES.has(name)
}

/**
 * Names the WIDGET may render — a superset of `UI_TOOL_NAMES`. The server emits
 * `answer` itself for triage / off-topic-decline replies (canned, no model call),
 * so the render boundary must allow it even though it is NOT advertised to the
 * model. Injection-safe: the route forwards *model* tool-calls only via `isUiTool`
 * (which excludes `answer`), so a model can never produce an `answer` event — only
 * the trusted server can.
 */
export const RENDERABLE_TOOL_NAMES = new Set([...UI_TOOL_NAMES, 'answer'])

// ── Streaming wire protocol (NDJSON: one JSON object per line) ───────────────

export type UiEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'done'; model: string }
  | { type: 'error'; message: string }

export function encodeEvent(ev: UiEvent): string {
  return JSON.stringify(ev) + '\n'
}

/** Parse a buffer of NDJSON into events + the remaining partial line. */
export function decodeEvents(buffer: string): { events: UiEvent[]; rest: string } {
  const lines = buffer.split('\n')
  const rest = lines.pop() ?? ''
  const events: UiEvent[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed) as UiEvent)
    } catch {
      // skip malformed line
    }
  }
  return { events, rest }
}
