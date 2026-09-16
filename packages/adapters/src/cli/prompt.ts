import type { AdapterRequest, ToolDefinition } from '@agentskit/core'

/**
 * Serializes an `AdapterRequest` as clearly labelled prompt blocks for
 * agentic CLIs (Claude Code, Codex, ...) that read a natural-language prompt
 * from stdin.
 *
 * The generic `createCliAdapter` default writes the raw `AdapterRequest` JSON
 * to stdin, which is the right contract for a purpose-built CLI but is
 * hostile to agentic CLIs: Claude Code, for example, treats a raw JSON blob
 * containing `systemPrompt` as a prompt-injection attempt and refuses it.
 * First-party manifests for those CLIs use this serializer instead; the
 * Claude Code manifests go further and pass system instructions through
 * `--append-system-prompt` (`claudeCodeRequestArgs`) with `serializeCliMessages`
 * on stdin, because Claude Code also flags labelled `[system]`/`[tools]`
 * blocks inside the user prompt.
 *
 * Output shape:
 *
 * ```text
 * [system]
 * ...system prompt...
 *
 * [tools]
 * ...JSON list of tool definitions + response contract...
 *
 * [user]
 * ...
 *
 * [assistant]
 * ...
 * ```
 */
export function serializeCliPrompt(request: AdapterRequest, options: SerializeCliPromptOptions = {}): string {
  const blocks: string[] = []
  const system = request.context?.systemPrompt
  if (options.system !== false && system) blocks.push(`[system]\n${system}`)
  const tools = request.context?.tools
  if (options.tools !== false && tools && tools.length > 0) blocks.push(`[tools]\n${describeTools(tools)}`)
  const messages = request.messages.filter(message => message.role !== 'system' || options.system !== false)
  if (blocks.length === 0 && messages.length === 1 && messages[0]!.role === 'user') return `${messages[0]!.content}\n`
  for (const message of messages) blocks.push(`[${message.role}]\n${message.content}`)
  return `${blocks.join('\n\n')}\n`
}

export interface SerializeCliPromptOptions {
  /** Include the `[system]` block and `system` messages. Default `true`. */
  system?: boolean
  /** Include the `[tools]` block. Default `true`. */
  tools?: boolean
}

/**
 * Conversation-only serializer for CLIs that take the system prompt through
 * argv (see `buildCliSystemPrompt`). A single user message is written bare;
 * multi-turn conversations use `[user]`/`[assistant]`/`[tool]` blocks.
 */
export function serializeCliMessages(request: AdapterRequest): string {
  return serializeCliPrompt(request, { system: false, tools: false })
}

/**
 * System instructions for a request: the system prompt plus, when tools are
 * present, the tool list and the JSON tool-call contract. Returns `undefined`
 * when the request carries neither. Intended for CLIs with a system-prompt
 * flag; Claude Code treats the same text inside the user prompt as an
 * injection attempt.
 */
export function buildCliSystemPrompt(request: AdapterRequest): string | undefined {
  const parts: string[] = []
  if (request.context?.systemPrompt) parts.push(request.context.systemPrompt)
  const tools = request.context?.tools
  if (tools && tools.length > 0) parts.push(describeTools(tools))
  return parts.length > 0 ? parts.join('\n\n') : undefined
}

/** Extra `claude -p` argv: `--append-system-prompt` when the request has system instructions or tools. */
export function claudeCodeRequestArgs(request: AdapterRequest): readonly string[] {
  const system = buildCliSystemPrompt(request)
  return system ? ['--append-system-prompt', system] : []
}

const TOOL_CONTRACT = [
  'The application running you exposes the tools listed below; it executes them, not you.',
  'To call one or more of them, reply with only a single JSON object',
  '{"text"?: string, "toolCalls": [{"id": string, "name": string, "args": string}]} where `args` is a JSON-encoded',
  'string of the tool arguments and `id` is any unique string. When no tool call is needed, reply with plain text.',
].join(' ')

function describeTools(tools: readonly ToolDefinition[]): string {
  const definitions = tools.map(tool => ({ name: tool.name, description: tool.description, schema: tool.schema }))
  return `${TOOL_CONTRACT}\n${JSON.stringify(definitions, null, 2)}`
}
