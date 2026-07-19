import { StatechartDiagnosticCodes, StatechartError } from './types'
import type {
  JsonObject,
  StatechartDefinition,
  StatechartDefinitionInput,
  StatechartDiagnostic,
  StatechartEvent,
  StatechartState,
  StatechartTransition,
} from './types'

const diagnostic = (
  code: StatechartDiagnostic['code'],
  message: string,
): StatechartDiagnostic => Object.freeze({ code, message })

const hasOwn = (input: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(input, key)

function assertNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `${field} must be a non-empty string`),
    )
  }
}

const isPlainRecord = (input: unknown): input is Record<string, unknown> => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false
  try {
    const prototype = Object.getPrototypeOf(input) as object | null
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

const dataEntries = (input: Record<string, unknown>, field: string): Array<[string, unknown]> => {
  try {
    if (Object.getOwnPropertySymbols(input).length > 0) {
      throw new StatechartError(
        diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `${field} cannot contain symbol keys`),
      )
    }
    return Object.getOwnPropertyNames(input).map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(input, key)
      if (!descriptor || !('value' in descriptor)) {
        throw new StatechartError(
          diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `${field} cannot contain accessors`),
        )
      }
      return [key, descriptor.value]
    })
  } catch (cause) {
    if (cause instanceof StatechartError) throw cause
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `${field} could not be inspected safely`),
    )
  }
}

const freezeDefinition = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  input: StatechartDefinitionInput<TContext, TEvent, TState>,
): StatechartDefinition<TContext, TEvent, TState> => {
  const states = Object.create(null) as Partial<
    Record<TState, StatechartState<TContext, TEvent, TState>>
  >

  for (const stateName of Object.keys(input.states) as TState[]) {
    const state = input.states[stateName]
    const on = Object.create(null) as Record<
      string,
      StatechartTransition<TContext, TEvent, TState>
    >

    const transitions = Object.entries(state.on ?? {}) as Array<
      [string, StatechartTransition<TContext, TEvent, TState> | undefined]
    >
    for (const [eventType, transition] of transitions) {
      if (transition === undefined) continue
      on[eventType] = Object.freeze({ ...transition })
    }

    states[stateName] = Object.freeze({
      ...(Object.keys(on).length > 0 ? { on: Object.freeze(on) } : {}),
    }) as StatechartState<TContext, TEvent, TState>
  }

  return Object.freeze({
    id: input.id,
    initial: input.initial,
    parseContext: input.parseContext,
    states: Object.freeze(states) as Readonly<
      Record<TState, StatechartState<TContext, TEvent, TState>>
    >,
    version: input.version,
  }) as StatechartDefinition<TContext, TEvent, TState>
}

export const defineStatechart = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  const TState extends string,
>(
  input: StatechartDefinitionInput<TContext, TEvent, TState>,
): StatechartDefinition<TContext, TEvent, TState> => {
  if (!isPlainRecord(input)) {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, 'definition must be a plain object'),
    )
  }
  const definitionFields = new Map(dataEntries(input, 'definition'))
  const id = definitionFields.get('id')
  const version = definitionFields.get('version')
  const initial = definitionFields.get('initial')
  const parseContext = definitionFields.get('parseContext')
  const states = definitionFields.get('states')

  assertNonEmpty(id, 'id')
  assertNonEmpty(version, 'version')
  assertNonEmpty(initial, 'initial')
  if (typeof parseContext !== 'function') {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, 'parseContext must be a function'),
    )
  }
  if (!isPlainRecord(states)) {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, 'states must be a plain object'),
    )
  }

  const stateEntries = dataEntries(states, 'states')
  if (stateEntries.length === 0) {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, 'states must contain at least one state'),
    )
  }
  if (!hasOwn(states, initial)) {
    throw new StatechartError(
      diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `initial state "${initial}" is not defined`),
    )
  }

  for (const [stateName, stateValue] of stateEntries) {
    assertNonEmpty(stateName, 'state name')
    if (!isPlainRecord(stateValue)) {
      throw new StatechartError(
        diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `state "${stateName}" must be a plain object`),
      )
    }
    const stateFields = dataEntries(stateValue, `state "${stateName}"`)
    const onValue = stateFields.find(([key]) => key === 'on')?.[1]
    if (onValue !== undefined && !isPlainRecord(onValue)) {
      throw new StatechartError(
        diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `state "${stateName}" transitions must be a plain object`),
      )
    }
    const transitions = dataEntries((onValue ?? {}) as Record<string, unknown>, `state "${stateName}" transitions`)
    for (const [eventType, transitionValue] of transitions) {
      if (transitionValue === undefined) continue
      assertNonEmpty(eventType, 'event type')
      if (!isPlainRecord(transitionValue)) {
        throw new StatechartError(
          diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `transition "${stateName}.${eventType}" must be a plain object`),
        )
      }
      dataEntries(transitionValue, `transition "${stateName}.${eventType}"`)
      const transition = transitionValue as unknown as StatechartTransition<TContext, TEvent, TState>
      assertNonEmpty(transition.target, `transition "${stateName}.${eventType}" target`)
      if (transition.guard !== undefined && typeof transition.guard !== 'function') {
        throw new StatechartError(
          diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `transition "${stateName}.${eventType}" guard must be a function`),
        )
      }
      if (transition.reduce !== undefined && typeof transition.reduce !== 'function') {
        throw new StatechartError(
          diagnostic(StatechartDiagnosticCodes.DEFINITION_INVALID, `transition "${stateName}.${eventType}" reducer must be a function`),
        )
      }
      if (!hasOwn(states, transition.target)) {
        throw new StatechartError(
          diagnostic(
            StatechartDiagnosticCodes.DEFINITION_INVALID,
            `transition "${stateName}.${eventType}" targets unknown state "${transition.target}"`,
          ),
        )
      }
    }
  }

  return freezeDefinition({
    id,
    initial: initial as TState,
    parseContext: parseContext as StatechartDefinitionInput<TContext, TEvent, TState>['parseContext'],
    states: states as StatechartDefinitionInput<TContext, TEvent, TState>['states'],
    version,
  })
}
