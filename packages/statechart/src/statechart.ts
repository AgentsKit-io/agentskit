import { cloneJsonObject } from './json'
import { StatechartDiagnosticCodes, StatechartError } from './types'
import type {
  DeepReadonly,
  JsonObject,
  StatechartCreationOptions,
  StatechartDefinition,
  StatechartDefinitionInput,
  StatechartDiagnostic,
  StatechartEvent,
  StatechartInstance,
  StatechartObserver,
  StatechartObserverResult,
  StatechartState,
  StatechartTransition,
  StatechartTransitionOptions,
  StatechartTransitionResult,
} from './types'

const diagnostic = (
  code: StatechartDiagnostic['code'],
  message: string,
): StatechartDiagnostic => Object.freeze({ code, message })

const hasOwn = (input: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(input, key)

const assertNonEmpty = (value: string, field: string): void => {
  if (value.trim().length === 0) {
    throw new StatechartError(
      diagnostic(
        StatechartDiagnosticCodes.DEFINITION_INVALID,
        `${field} must be a non-empty string`,
      ),
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
  const states: Partial<
    Record<TState, StatechartState<TContext, TEvent, TState>>
  > = {}

  for (const stateName of Object.keys(input.states) as TState[]) {
    const state = input.states[stateName]
    const on: Record<
      string,
      StatechartTransition<TContext, TEvent, TState>
    > = {}

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
  assertNonEmpty(input.id, 'id')
  assertNonEmpty(input.version, 'version')

  const stateNames = Object.keys(input.states)
  if (stateNames.length === 0) {
    throw new StatechartError(
      diagnostic(
        StatechartDiagnosticCodes.DEFINITION_INVALID,
        'states must contain at least one state',
      ),
    )
  }

  if (!hasOwn(input.states, input.initial)) {
    throw new StatechartError(
      diagnostic(
        StatechartDiagnosticCodes.DEFINITION_INVALID,
        `initial state "${input.initial}" is not defined`,
      ),
    )
  }

  const states = Object.entries(input.states) as Array<
    [string, StatechartState<TContext, TEvent, TState>]
  >
  for (const [stateName, state] of states) {
    assertNonEmpty(stateName, 'state name')
    const transitions = Object.entries(state.on ?? {}) as Array<
      [string, StatechartTransition<TContext, TEvent, TState> | undefined]
    >
    for (const [eventType, transition] of transitions) {
      if (transition === undefined) continue
      assertNonEmpty(eventType, 'event type')
      if (!hasOwn(input.states, transition.target)) {
        throw new StatechartError(
          diagnostic(
            StatechartDiagnosticCodes.DEFINITION_INVALID,
            `transition "${stateName}.${eventType}" targets unknown state "${transition.target}"`,
          ),
        )
      }
    }
  }

  return freezeDefinition(input)
}

export const parseStatechartContext = <TContext extends JsonObject>(
  definition: Pick<StatechartDefinitionInput<TContext, StatechartEvent, string>, 'parseContext'>,
  input: unknown,
): DeepReadonly<TContext> =>
  cloneJsonObject<TContext>(definition.parseContext(cloneJsonObject(input)))

export const createStatechartInstance = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  definition: StatechartDefinition<TContext, TEvent, TState>,
  context: unknown,
  options: StatechartCreationOptions,
): StatechartInstance<TContext, TState> => {
  assertNonEmpty(options.instanceId, 'instanceId')
  assertNonEmpty(options.now, 'now')

  try {
    return Object.freeze({
      context: parseStatechartContext(definition, context),
      instanceId: options.instanceId,
      machineId: definition.id,
      machineVersion: definition.version,
      revision: 0,
      state: definition.initial,
      updatedAt: options.now,
    })
  } catch (cause) {
    if (cause instanceof StatechartError) throw cause
    throw new StatechartError(
      diagnostic(
        StatechartDiagnosticCodes.CONTEXT_INVALID,
        'initial context failed runtime validation',
      ),
    )
  }
}

const rejectTransition = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  instance: StatechartInstance<TContext, TState>,
  event: DeepReadonly<TEvent>,
  reason: StatechartDiagnostic,
): StatechartTransitionResult<TContext, TEvent, TState> =>
  Object.freeze({
    diagnostic: reason,
    event,
    from: instance.state,
    instance,
    status: 'rejected',
  })

export const transitionStatechart = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  definition: StatechartDefinition<TContext, TEvent, TState>,
  instance: StatechartInstance<TContext, TState>,
  event: TEvent,
  options: StatechartTransitionOptions,
): StatechartTransitionResult<TContext, TEvent, TState> => {
  const frozenEvent = cloneJsonObject({ ...event }) as DeepReadonly<TEvent>

  if (
    instance.machineId !== definition.id ||
    instance.machineVersion !== definition.version
  ) {
    return rejectTransition(
      instance,
      frozenEvent,
      diagnostic(
        StatechartDiagnosticCodes.INSTANCE_MISMATCH,
        'instance does not belong to this statechart definition',
      ),
    )
  }

  const state = definition.states[instance.state]
  const transitions = state.on as
    | Readonly<Record<string, StatechartTransition<TContext, TEvent, TState>>>
    | undefined
  const candidate = transitions?.[event.type]

  if (candidate === undefined) {
    return rejectTransition(
      instance,
      frozenEvent,
      diagnostic(
        StatechartDiagnosticCodes.TRANSITION_UNAVAILABLE,
        `event "${event.type}" is not accepted in state "${instance.state}"`,
      ),
    )
  }

  if (candidate.guard !== undefined) {
    try {
      if (!candidate.guard(instance.context, frozenEvent)) {
        return rejectTransition(
          instance,
          frozenEvent,
          diagnostic(
            StatechartDiagnosticCodes.GUARD_REJECTED,
            `guard rejected event "${event.type}"`,
          ),
        )
      }
    } catch {
      return rejectTransition(
        instance,
        frozenEvent,
        diagnostic(
          StatechartDiagnosticCodes.GUARD_FAILED,
          `guard failed while evaluating event "${event.type}"`,
        ),
      )
    }
  }

  let nextContext = instance.context
  if (candidate.reduce !== undefined) {
    let reducedContext: TContext
    try {
      reducedContext = candidate.reduce(instance.context, frozenEvent)
    } catch {
      return rejectTransition(
        instance,
        frozenEvent,
        diagnostic(
          StatechartDiagnosticCodes.REDUCER_FAILED,
          `reducer failed while handling event "${event.type}"`,
        ),
      )
    }

    try {
      nextContext = parseStatechartContext(definition, reducedContext)
    } catch {
      return rejectTransition(
        instance,
        frozenEvent,
        diagnostic(
          StatechartDiagnosticCodes.CONTEXT_INVALID,
          `reducer returned invalid context for event "${event.type}"`,
        ),
      )
    }
  }

  const nextInstance: StatechartInstance<TContext, TState> = Object.freeze({
    context: nextContext,
    instanceId: instance.instanceId,
    machineId: instance.machineId,
    machineVersion: instance.machineVersion,
    revision: instance.revision + 1,
    state: candidate.target,
    updatedAt: options.now,
  })

  return Object.freeze({
    event: frozenEvent,
    from: instance.state,
    instance: nextInstance,
    status: 'accepted',
    to: candidate.target,
  })
}

export const notifyStatechartObserver = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  observer: StatechartObserver<TContext, TEvent, TState>,
  result: StatechartTransitionResult<TContext, TEvent, TState>,
): StatechartObserverResult => {
  try {
    observer(result)
    return Object.freeze({ status: 'delivered' })
  } catch {
    return Object.freeze({
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.OBSERVER_FAILED,
        'statechart observer failed',
      ),
      status: 'rejected',
    })
  }
}
