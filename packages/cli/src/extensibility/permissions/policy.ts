import type { ToolDefinition } from '@agentskit/core'

export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions'

export type PermissionAction = 'allow' | 'ask' | 'deny'

export interface PermissionRule {
  /** Exact name, or a `RegExp` / `"re:pattern"` string matching the tool name. */
  tool: string | RegExp
  action: PermissionAction
  scope?: 'session' | 'project' | 'global'
}

export interface PermissionPolicy {
  mode: PermissionMode
  rules: PermissionRule[]
}

export const defaultPolicy: PermissionPolicy = {
  mode: 'default',
  rules: [],
}

/**
 * Resolve an action for a tool name. Modes override specific rules:
 *
 *   - `bypassPermissions`: everything → allow
 *   - `plan`:              everything → ask (pretend the agent is planning)
 *   - `acceptEdits`:       fs_write / edit tools → allow, others unchanged
 *   - `default`:           rules drive it; no matching rule → ask
 */
export function evaluatePolicy(policy: PermissionPolicy, toolName: string): PermissionAction {
  if (policy.mode === 'bypassPermissions') return 'allow'
  if (policy.mode === 'plan') return 'ask'

  for (const rule of policy.rules) {
    if (matchesRule(rule, toolName)) return rule.action
  }

  if (policy.mode === 'acceptEdits' && /^(fs_write|edit|write_file)/.test(toolName)) {
    return 'allow'
  }

  return 'ask'
}

function matchesRule(rule: PermissionRule, toolName: string): boolean {
  if (rule.tool instanceof RegExp) return rule.tool.test(toolName)
  const str = rule.tool
  if (str.startsWith('re:')) return new RegExp(str.slice(3)).test(toolName)
  return str === toolName
}

/**
 * Apply the policy to a tool definition. Returns the tool with
 * `requiresConfirmation` set per the evaluated action, or `null` when the
 * tool is denied (the caller should skip it entirely).
 */
export function applyPolicyToTool(
  policy: PermissionPolicy,
  tool: ToolDefinition,
): ToolDefinition | null {
  const action = evaluatePolicy(policy, tool.name)
  if (action === 'deny') return null
  if (action === 'allow') return { ...tool, requiresConfirmation: false }
  return { ...tool, requiresConfirmation: true }
}

/** Filter+annotate a tool list under a policy. Denied tools dropped. */
export function applyPolicyToTools(
  policy: PermissionPolicy,
  tools: ToolDefinition[],
): ToolDefinition[] {
  const out: ToolDefinition[] = []
  for (const tool of tools) {
    const gated = applyPolicyToTool(policy, tool)
    if (gated) out.push(gated)
  }
  return out
}
