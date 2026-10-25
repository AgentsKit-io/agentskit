/**
 * Generative UI — typed JSON the agent emits that downstream
 * renderers turn into real components. The schema is intentionally
 * framework-agnostic (React, Vue, Svelte, RN all render the same
 * tree) and keeps the element set small so model outputs stay
 * predictable.
 *
 * Paired with artifacts (code blocks, charts, markdown, HTML) so a
 * single `UIMessage` can mix declarative UI + rich content.
 */

import { isRecord } from './primitives'

/** Plain text node in a structured UI message. */
export interface UIElementText {
  kind: 'text'
  text: string
  weight?: 'normal' | 'bold'
}

/** Heading node in a structured UI message. */
export interface UIElementHeading {
  kind: 'heading'
  level: 1 | 2 | 3
  text: string
}

/** Ordered or unordered list node in a structured UI message. */
export interface UIElementList {
  kind: 'list'
  ordered?: boolean
  items: string[]
}

/** Button node with a label and optional action payload. */
export interface UIElementButton {
  kind: 'button'
  label: string
  action: string
  payload?: Record<string, unknown>
  variant?: 'primary' | 'secondary' | 'danger'
}

/** Image node with a source URL and optional alternative text. */
export interface UIElementImage {
  kind: 'image'
  src: string
  alt?: string
}

/** Card node containing child UI elements. */
export interface UIElementCard {
  kind: 'card'
  title?: string
  children: UIElement[]
}

/** Layout node that groups child UI elements in a stack. */
export interface UIElementStack {
  kind: 'stack'
  direction?: 'row' | 'column'
  children: UIElement[]
}

/** UI node that embeds a typed artifact. */
export interface UIElementArtifact {
  kind: 'artifact'
  artifact: Artifact
}

/** Discriminated union of the supported structured UI nodes. */
export type UIElement =
  | UIElementText
  | UIElementHeading
  | UIElementList
  | UIElementButton
  | UIElementImage
  | UIElementCard
  | UIElementStack
  | UIElementArtifact

// ---------------------------------------------------------------------------
// Artifacts — rich content blocks
// ---------------------------------------------------------------------------

/** Source-code artifact with a language identifier. */
export interface ArtifactCode {
  type: 'code'
  language: string
  source: string
  filename?: string
}

/** Markdown document artifact. */
export interface ArtifactMarkdown {
  type: 'markdown'
  source: string
}

/** HTML artifact marked as untrusted for safe renderer handling. */
export interface ArtifactHtml {
  type: 'html'
  source: string
  /** Explicitly untrusted; renderers must sanitize or isolate before mounting. */
  trust: 'untrusted'
  /** Sandbox policy hint for the renderer (iframe sandbox attrs). */
  sandbox?: string
}

/** Data and display settings for a chart artifact. */
export interface ArtifactChart {
  type: 'chart'
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'area'
  data: Array<Record<string, number | string>>
  x?: string
  y?: string | string[]
  title?: string
}

/** Discriminated union of supported code, text, HTML, and chart artifacts. */
export type Artifact = ArtifactCode | ArtifactMarkdown | ArtifactHtml | ArtifactChart

// ---------------------------------------------------------------------------
// UI message wrapper + validators
// ---------------------------------------------------------------------------

/** Versioned message containing structured UI elements. */
export interface UIMessage {
  version: 1
  root: UIElement
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid UIMessage: ${message}`)
}

/**
 * Validate an untrusted artifact object.
 * @param raw Value to validate.
 * @returns The artifact when its kind and fields are supported.
 * @throws {Error} If the value does not match a supported artifact shape.
 */
export function validateArtifact(raw: unknown): Artifact {
  assert(isRecord(raw), 'artifact must be an object')
  const type = raw.type
  if (type === 'code') {
    assert(typeof raw.language === 'string', 'artifact.language must be string')
    assert(typeof raw.source === 'string', 'artifact.source must be string')
    return raw as unknown as ArtifactCode
  }
  if (type === 'markdown' || type === 'html') {
    assert(typeof raw.source === 'string', 'artifact.source must be string')
    if (type === 'html') assert(raw.trust === 'untrusted', 'html artifacts must be marked trust:"untrusted"')
    return raw as unknown as ArtifactMarkdown | ArtifactHtml
  }
  if (type === 'chart') {
    assert(typeof raw.chartType === 'string', 'artifact.chartType must be string')
    assert(Array.isArray(raw.data), 'artifact.data must be an array')
    return raw as unknown as ArtifactChart
  }
  throw new Error(`Invalid UIMessage: unknown artifact.type "${String(type)}"`)
}

function validateChildren(raw: unknown): UIElement[] {
  assert(Array.isArray(raw), 'children must be an array')
  return raw.map(c => validateElement(c))
}

/**
 * Validate an untrusted structured UI element, including nested children.
 * @param raw Value to validate.
 * @returns The validated UI element.
 * @throws {Error} If its kind or nested fields are invalid.
 */
export function validateElement(raw: unknown): UIElement {
  assert(isRecord(raw), 'element must be an object')
  switch (raw.kind) {
    case 'text':
      assert(typeof raw.text === 'string', 'text.text must be string')
      return raw as unknown as UIElementText
    case 'heading':
      assert([1, 2, 3].includes(Number(raw.level)), 'heading.level must be 1, 2, or 3')
      assert(typeof raw.text === 'string', 'heading.text must be string')
      return raw as unknown as UIElementHeading
    case 'list':
      assert(Array.isArray(raw.items), 'list.items must be an array')
      assert(raw.items.every((i: unknown) => typeof i === 'string'), 'list.items must be strings')
      return raw as unknown as UIElementList
    case 'button':
      assert(typeof raw.label === 'string' && typeof raw.action === 'string', 'button.label/action required')
      return raw as unknown as UIElementButton
    case 'image':
      assert(typeof raw.src === 'string', 'image.src must be string')
      return raw as unknown as UIElementImage
    case 'card':
      return { ...raw, children: validateChildren(raw.children) } as UIElementCard
    case 'stack':
      return { ...raw, children: validateChildren(raw.children) } as UIElementStack
    case 'artifact':
      return { kind: 'artifact', artifact: validateArtifact(raw.artifact) }
    default:
      throw new Error(`Invalid UIMessage: unknown element.kind "${String(raw.kind)}"`)
  }
}

/**
 * Validate an untrusted versioned UI message and its elements.
 * @param raw Value to validate.
 * @returns The validated UI message.
 * @throws {Error} If the version or any element is invalid.
 */
export function validateUIMessage(raw: unknown): UIMessage {
  assert(isRecord(raw), 'root must be an object')
  assert(raw.version === 1, `unsupported version: ${String(raw.version)}`)
  return { version: 1, root: validateElement(raw.root) }
}

/**
 * Parse text that may contain a fenced JSON block (```json ... ```),
 * or a raw JSON object, into a `UIMessage`. Useful when agents emit
 * prose + UI side-by-side.
 */
export function parseUIMessage(input: string): UIMessage {
  const fenced = input.match(/```(?:json)?\n?([\s\S]*?)```/)
  const body = (fenced?.[1] ?? input).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('parseUIMessage: no JSON object found')
  return validateUIMessage(JSON.parse(body.slice(start, end + 1)))
}

// ---------------------------------------------------------------------------
// Artifact detection — pull artifacts out of a plain text stream
// ---------------------------------------------------------------------------

/** Code artifact found in text, with source offsets for its fenced block. */
export interface DetectedArtifact {
  artifact: Artifact
  /** Offsets in the source where the fence started / ended. */
  start: number
  end: number
}

/**
 * Scan a string for fenced code blocks and return them as `code`
 * artifacts. HTML / markdown / chart artifacts are left to the
 * agent to emit explicitly via `UIMessage`.
 */
export function detectCodeArtifacts(input: string): DetectedArtifact[] {
  const pattern = /```(\w+)?\n([\s\S]*?)```/g
  const out: DetectedArtifact[] = []
  for (const match of input.matchAll(pattern)) {
    const start = match.index ?? 0
    out.push({
      artifact: {
        type: 'code',
        language: match[1] ?? 'plaintext',
        source: match[2] ?? '',
      },
      start,
      end: start + match[0].length,
    })
  }
  return out
}
