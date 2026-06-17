'use client'

import type { ComponentType, ReactNode } from 'react'
import { UI_TOOL_NAMES } from '@/lib/ask/protocol'

/**
 * Generative-UI tool registry — the anti-injection render boundary.
 *
 * The model never ships components; it ships *tool calls* (`{ name, args }`)
 * that arrive over the wire as `UiEvent`s. The widget renders them by looking
 * the name up in this registry. Two gates protect the boundary:
 *
 *   1. allow-list — the name must be in `UI_TOOL_NAMES` (the canonical set the
 *      server advertises in `protocol.ts`). An unknown or spoofed name renders
 *      nothing.
 *   2. presence    — the name must have a registered component. A name that is
 *      allow-listed but unregistered also renders nothing.
 *
 * Per-tool argument validation lives inside each component (and, for structured
 * element payloads, via `validateElement` from `@agentskit/core/generative-ui`),
 * so a malformed payload degrades to nothing rather than throwing.
 */

/**
 * Context handed to every UI-tool component. Interaction callbacks let a tool
 * drive the conversation (send a new turn) or execute code in the browser
 * sandbox. All are optional so components stay renderable in isolation (tests,
 * storybook) where no host is wired.
 */
export interface UiToolContext {
  /** A clickable option / button chose `value` — host should send it as a turn. */
  onSelect?: (value: string) => void
  /** A form submitted `action` with collected `values`. */
  onSubmit?: (action: string, values: Record<string, string>) => void
  /** A code block requested a run — host executes via the web sandbox. */
  onRun?: (code: string) => void
  /** Stable id of the tool part (for keys / dedupe). */
  id?: string
}

/**
 * A UI-tool component receives the model-supplied `args` (unknown until the
 * component narrows them) plus the host `ctx`.
 */
export type UiToolProps<P> = { args: P; ctx: UiToolContext }

/** A registered UI tool: its wire `name` and the component that renders it. */
export interface UiTool<P = unknown> {
  name: string
  Component: ComponentType<UiToolProps<P>>
}

/**
 * Define a single UI tool. The generic `P` is the shape the component expects
 * `args` to be after it narrows them; the registry stores the tool type-erased.
 */
export function defineUITool<P>(config: {
  name: string
  Component: ComponentType<UiToolProps<P>>
}): UiTool<P> {
  return { name: config.name, Component: config.Component }
}

/**
 * A built registry: a lookup of name → component plus a guarded `render`.
 */
export interface UiToolRegistry {
  /** Type-erased component lookup by tool name. */
  readonly components: Record<string, ComponentType<UiToolProps<unknown>>>
  /** True when `name` is allow-listed AND has a registered component. */
  has(name: string): boolean
  /**
   * Render a tool call. Returns `null` (rendering nothing) when the tool is not
   * allow-listed or not registered — the injection-safe default. `args` stays
   * `unknown`; each component narrows it internally.
   */
  render(name: string, args: unknown, ctx: UiToolContext): ReactNode
}

/**
 * Assemble a registry from a list of `defineUITool` results. Tools whose name is
 * not in the canonical `UI_TOOL_NAMES` allow-list are dropped at build time with
 * a warning — the registry can never widen the server's advertised surface.
 */
export function createRegistry(tools: ReadonlyArray<UiTool<unknown>>): UiToolRegistry {
  const components: Record<string, ComponentType<UiToolProps<unknown>>> = {}

  for (const tool of tools) {
    if (!UI_TOOL_NAMES.has(tool.name)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ask-registry] tool "${tool.name}" is not in UI_TOOL_NAMES; dropped from registry.`,
      )
      continue
    }
    components[tool.name] = tool.Component as ComponentType<UiToolProps<unknown>>
  }

  function has(name: string): boolean {
    return UI_TOOL_NAMES.has(name) && name in components
  }

  function render(name: string, args: unknown, ctx: UiToolContext): ReactNode {
    if (!UI_TOOL_NAMES.has(name)) {
      // eslint-disable-next-line no-console
      console.warn(`[ask-registry] blocked non-allow-listed tool "${name}".`)
      return null
    }
    const Component = components[name]
    if (!Component) {
      // eslint-disable-next-line no-console
      console.warn(`[ask-registry] allow-listed tool "${name}" has no component.`)
      return null
    }
    return <Component args={args} ctx={ctx} />
  }

  return { components, has, render }
}
