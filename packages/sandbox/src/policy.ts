import { ErrorCodes, SandboxError } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'

export interface SandboxPolicy {
  /** Tool names that MUST run inside a sandbox. Missing → allowed raw. */
  requireSandbox?: string[] | '*'
  /** Tool names that are completely banned. */
  deny?: string[]
  /** Explicit allow-list. Anything not listed is denied. Overrides `deny`. */
  allow?: string[]
  /** Per-tool argument validators — fired before execution. */
  validators?: Record<string, (args: Record<string, unknown>) => void>
  /** Observability hook. */
  onPolicyEvent?: (event: PolicyEvent) => void
}

export type PolicyEvent =
  | { type: 'allow'; tool: string; reason: 'explicit-allow' | 'not-restricted' }
  | { type: 'deny'; tool: string; reason: 'denied' | 'not-in-allow-list' | 'validation-failed'; error?: string }
  | { type: 'sandbox-required'; tool: string }

export interface MandatorySandboxWrapper {
  /** Returns the wrapped tool or throws if the policy forbids it entirely. */
  wrap: (tool: ToolDefinition) => ToolDefinition
  /** Evaluate the policy without wrapping (useful for dry-run tooling). */
  check: (tool: ToolDefinition) => { allowed: boolean; mustSandbox: boolean; reason?: string }
}

function inList(list: string[] | '*' | undefined, name: string): boolean {
  if (!list) return false
  if (list === '*') return true
  return list.includes(name)
}

/**
 * Enforce a sandbox policy across every tool the runtime sees.
 *
 *   const mandatory = createMandatorySandbox({
 *     sandbox: sandboxTool(),
 *     policy: { requireSandbox: ['shell', 'code_execution'], deny: ['filesystem'] },
 *   })
 *   tools = tools.map(t => mandatory.wrap(t))
 *
 * Wrapping strategy:
 *   - denied / not-in-allow: `execute` throws — runtime returns an error
 *     to the model instead of actually running.
 *   - require-sandbox: the tool's execute is replaced with a shim that
 *     routes calls through the shared sandbox tool's execute.
 *   - validators: run synchronously before execute; throw aborts the call.
 */
export function createMandatorySandbox(options: {
  sandbox: ToolDefinition
  policy: SandboxPolicy
}): MandatorySandboxWrapper {
  const { sandbox, policy } = options
  const emit = (e: PolicyEvent): void => policy.onPolicyEvent?.(e)

  const decide = (
    tool: ToolDefinition,
  ): { allowed: boolean; mustSandbox: boolean; reason?: string } => {
    if (inList(policy.deny, tool.name)) {
      return { allowed: false, mustSandbox: false, reason: 'denied' }
    }
    if (policy.allow && !policy.allow.includes(tool.name)) {
      return { allowed: false, mustSandbox: false, reason: 'not-in-allow-list' }
    }
    const mustSandbox = inList(policy.requireSandbox, tool.name)
    return { allowed: true, mustSandbox }
  }

  return {
    check: decide,
    wrap(tool) {
      const decision = decide(tool)
      if (!decision.allowed) {
        emit({ type: 'deny', tool: tool.name, reason: decision.reason as 'denied' | 'not-in-allow-list' })
        return {
          ...tool,
          execute: async () => {
            throw new SandboxError({
              code: ErrorCodes.AK_SANDBOX_DENIED,
              message: `Tool "${tool.name}" is ${decision.reason} by sandbox policy`,
              hint: 'Adjust SandboxPolicy allow / deny lists to permit this tool.',
            })
          },
        }
      }
      const validator = policy.validators?.[tool.name]
      const baseExecute = decision.mustSandbox ? sandbox.execute : tool.execute

      if (decision.mustSandbox) {
        emit({ type: 'sandbox-required', tool: tool.name })
      } else {
        emit({
          type: 'allow',
          tool: tool.name,
          reason: policy.allow?.includes(tool.name) ? 'explicit-allow' : 'not-restricted',
        })
      }

      return {
        ...tool,
        async execute(args: Record<string, unknown>, context) {
          if (validator) {
            try {
              validator(args)
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              emit({ type: 'deny', tool: tool.name, reason: 'validation-failed', error: message })
              throw err
            }
          }
          if (!baseExecute) {
            throw new SandboxError({
              code: ErrorCodes.AK_SANDBOX_INVALID_TOOL,
              message: `Tool "${tool.name}" has no execute function`,
              hint: 'Tool definitions wired through the sandbox must export an execute function.',
            })
          }
          return baseExecute(args, context)
        },
      }
    },
  }
}
