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
 * First-party manifests for those CLIs use this serializer instead.
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
export function serializeCliPrompt(request: AdapterRequest): string {
  const blocks: string[] = []
  const system = request.context?.systemPrompt
  if (system) blocks.push(`[system]\n${system}`)
  const tools = request.context?.tools
  if (tools && tools.length > 0) blocks.push(`[tools]\n${describeTools(tools)}`)
  for (const message of request.messages) blocks.push(`[${message.role}]\n${message.content}`)
  return `${blocks.join('\n\n')}\n`
}

const TOOL_CONTRACT = [
  'You may call the tools listed below. To call one or more tools, answer with a single JSON object',
  '{"text"?: string, "toolCalls": [{"id": string, "name": string, "args": string}]} where `args` is a JSON-encoded',
  'string of the tool arguments. When no tool call is needed, answer with plain text.',
].join(' ')

function describeTools(tools: readonly ToolDefinition[]): string {
  const definitions = tools.map(tool => ({ name: tool.name, description: tool.description, schema: tool.schema }))
  return `${TOOL_CONTRACT}\n${JSON.stringify(definitions, null, 2)}`
}
