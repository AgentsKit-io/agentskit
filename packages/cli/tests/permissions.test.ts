import { describe, expect, it } from 'vitest'
import {
  applyPolicyToTool,
  applyPolicyToTools,
  evaluatePolicy,
  type PermissionPolicy,
} from '../src/extensibility/permissions'
import type { ToolDefinition } from '@agentskit/core'

const mkTool = (name: string): ToolDefinition => ({
  name,
  description: name,
  parameters: { type: 'object', properties: {} } as never,
  execute: async () => ({}),
})

describe('evaluatePolicy', () => {
  it('default mode + no rules → ask', () => {
    const policy: PermissionPolicy = { mode: 'default', rules: [] }
    expect(evaluatePolicy(policy, 'shell')).toBe('ask')
  })

  it('bypassPermissions short-circuits to allow', () => {
    const policy: PermissionPolicy = {
      mode: 'bypassPermissions',
      rules: [{ tool: 'shell', action: 'deny' }],
    }
    expect(evaluatePolicy(policy, 'shell')).toBe('allow')
  })

  it('plan mode returns ask everywhere', () => {
    const policy: PermissionPolicy = {
      mode: 'plan',
      rules: [{ tool: 'shell', action: 'allow' }],
    }
    expect(evaluatePolicy(policy, 'shell')).toBe('ask')
  })

  it('rules matched by exact name', () => {
    const policy: PermissionPolicy = {
      mode: 'default',
      rules: [
        { tool: 'web_search', action: 'allow' },
        { tool: 'shell', action: 'deny' },
      ],
    }
    expect(evaluatePolicy(policy, 'web_search')).toBe('allow')
    expect(evaluatePolicy(policy, 'shell')).toBe('deny')
    expect(evaluatePolicy(policy, 'unknown')).toBe('ask')
  })

  it('supports regex and re: prefix', () => {
    const policy: PermissionPolicy = {
      mode: 'default',
      rules: [
        { tool: /^fs_/, action: 'ask' },
        { tool: 're:^danger', action: 'deny' },
      ],
    }
    expect(evaluatePolicy(policy, 'fs_read')).toBe('ask')
    expect(evaluatePolicy(policy, 'danger_zone')).toBe('deny')
  })

  it('acceptEdits auto-allows fs_write', () => {
    const policy: PermissionPolicy = { mode: 'acceptEdits', rules: [] }
    expect(evaluatePolicy(policy, 'fs_write')).toBe('allow')
    expect(evaluatePolicy(policy, 'shell')).toBe('ask')
  })
})

describe('applyPolicyToTool(s)', () => {
  it('drops denied tools', () => {
    const policy: PermissionPolicy = {
      mode: 'default',
      rules: [{ tool: 'shell', action: 'deny' }],
    }
    const tools = [mkTool('shell'), mkTool('web_search')]
    const result = applyPolicyToTools(policy, tools)
    expect(result.map(t => t.name)).toEqual(['web_search'])
  })

  it('sets requiresConfirmation based on action', () => {
    const policy: PermissionPolicy = {
      mode: 'default',
      rules: [
        { tool: 'web_search', action: 'allow' },
        { tool: 'shell', action: 'ask' },
      ],
    }
    const allow = applyPolicyToTool(policy, mkTool('web_search'))
    const ask = applyPolicyToTool(policy, mkTool('shell'))
    expect(allow?.requiresConfirmation).toBe(false)
    expect(ask?.requiresConfirmation).toBe(true)
  })
})
