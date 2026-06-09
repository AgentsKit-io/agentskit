import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { JSONSchema7 } from 'json-schema'
import type { Integration, IntegrationAction, IntegrationTrigger } from '../contract'

/**
 * Pure contract validators — no test-runner dependency. Wire these into a
 * vitest (or any) suite per service. They enforce the shape rules every
 * descriptor must satisfy before it can be projected by a consumer layer.
 */

export interface ValidationProblem {
  /** Dotted path to the offending field, e.g. `actions[0].schema`. */
  path: string
  message: string
}

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const ACTION_NAME_RE = /^[a-z][a-z0-9_]*$/

function isObjectSchema(schema: JSONSchema7 | undefined): boolean {
  return !!schema && schema.type === 'object'
}

export function validateAction(action: IntegrationAction, path: string): ValidationProblem[] {
  const problems: ValidationProblem[] = []
  if (!ACTION_NAME_RE.test(action.name)) {
    problems.push({ path: `${path}.name`, message: `invalid action name "${action.name}" (expected snake_case)` })
  }
  if (!action.description?.trim()) {
    problems.push({ path: `${path}.description`, message: 'description is required' })
  }
  if (!isObjectSchema(action.schema)) {
    problems.push({ path: `${path}.schema`, message: 'schema must be a JSON Schema object (type: "object")' })
  }
  if (typeof action.execute !== 'function') {
    problems.push({ path: `${path}.execute`, message: 'execute must be a function' })
  }
  return problems
}

export function validateTrigger(trigger: IntegrationTrigger, path: string): ValidationProblem[] {
  const problems: ValidationProblem[] = []
  if (!trigger.name?.trim()) {
    problems.push({ path: `${path}.name`, message: 'name is required' })
  }
  if (!SLUG_RE.test(trigger.source)) {
    problems.push({ path: `${path}.source`, message: `invalid source slug "${trigger.source}"` })
  }
  if (typeof trigger.normalize !== 'function') {
    problems.push({ path: `${path}.normalize`, message: 'normalize must be a function' })
  }
  return problems
}

/** Validate a full descriptor. Returns an empty array when the shape is sound. */
export function validateIntegration(integration: Integration): ValidationProblem[] {
  const problems: ValidationProblem[] = []

  if (!SLUG_RE.test(integration.name)) {
    problems.push({ path: 'name', message: `invalid integration slug "${integration.name}" (expected kebab-case)` })
  }
  if (!integration.displayName?.trim()) {
    problems.push({ path: 'displayName', message: 'displayName is required' })
  }
  if (!integration.categories?.length) {
    problems.push({ path: 'categories', message: 'at least one category is required' })
  }
  if (!integration.actions?.length && !integration.triggers?.length) {
    problems.push({ path: 'actions', message: 'an integration must declare at least one action or trigger' })
  }

  const actionNames = new Set<string>()
  integration.actions?.forEach((action, i) => {
    problems.push(...validateAction(action, `actions[${i}]`))
    if (actionNames.has(action.name)) {
      problems.push({ path: `actions[${i}].name`, message: `duplicate action name "${action.name}"` })
    }
    actionNames.add(action.name)
  })

  integration.triggers?.forEach((trigger, i) => {
    problems.push(...validateTrigger(trigger, `triggers[${i}]`))
  })

  // capabilities pointers must reference declared actions
  const { send, notify } = integration.capabilities ?? {}
  if (send && !actionNames.has(send)) {
    problems.push({ path: 'capabilities.send', message: `points to unknown action "${send}"` })
  }
  if (notify && !actionNames.has(notify)) {
    problems.push({ path: 'capabilities.notify', message: `points to unknown action "${notify}"` })
  }

  return problems
}

/** Throw if the descriptor is invalid — convenient inside a single `it(...)`. */
export function assertValidIntegration(integration: Integration): void {
  const problems = validateIntegration(integration)
  if (problems.length > 0) {
    const lines = problems.map((p) => `  - ${p.path}: ${p.message}`).join('\n')
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `integration "${integration.name}" failed contract validation:\n${lines}`,
      hint: 'Fix the listed fields in the integration descriptor.',
    })
  }
}
