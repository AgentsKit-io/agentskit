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

function assertNonEmpty(
  value: unknown,
  field: string,
  code: StatechartDiagnostic['code'] = StatechartDiagnosticCodes.DEFINITION_INVALID,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new StatechartError(
      diagnostic(
        code,
        `${field} must be a non-empty string`,
      ),
    )
  }
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
  assertNonEmpty(options?.instanceId, 'instanceId', StatechartDiagnosticCodes.INPUT_INVALID)
  assertNonEmpty(options?.now, 'now', StatechartDiagnosticCodes.INPUT_INVALID)

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
  let frozenEvent: DeepReadonly<TEvent>
  try {
    frozenEvent = cloneJsonObject(event) as unknown as DeepReadonly<TEvent>
    assertNonEmpty(frozenEvent.type, 'event type', StatechartDiagnosticCodes.INPUT_INVALID)
  } catch {
    return rejectTransition(
      instance,
      Object.freeze({ type: '' }) as DeepReadonly<TEvent>,
      diagnostic(StatechartDiagnosticCodes.INPUT_INVALID, 'event must be a JSON-compatible object with a non-empty type'),
    )
  }

  const now = options?.now
  if (typeof now !== 'string' || now.trim().length === 0) {
    return rejectTransition(
      instance,
      frozenEvent,
      diagnostic(StatechartDiagnosticCodes.INPUT_INVALID, 'now must be a non-empty string'),
    )
  }

  if (
    instance.machineId !== definition.id ||
    instance.machineVersion !== definition.version ||
    typeof instance.instanceId !== 'string' ||
    instance.instanceId.trim().length === 0 ||
    typeof instance.updatedAt !== 'string' ||
    instance.updatedAt.trim().length === 0 ||
    typeof instance.state !== 'string' ||
    !hasOwn(definition.states, instance.state) ||
    !Number.isSafeInteger(instance.revision) ||
    instance.revision < 0
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
  const candidate = transitions?.[frozenEvent.type]

  if (candidate === undefined) {
    return rejectTransition(
      instance,
      frozenEvent,
      diagnostic(
        StatechartDiagnosticCodes.TRANSITION_UNAVAILABLE,
        `event "${frozenEvent.type}" is not accepted in state "${instance.state}"`,
      ),
    )
  }

  if (instance.revision === Number.MAX_SAFE_INTEGER) {
    return rejectTransition(
      instance,
      frozenEvent,
      diagnostic(StatechartDiagnosticCodes.INPUT_INVALID, 'instance revision cannot be incremented safely'),
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
            `guard rejected event "${frozenEvent.type}"`,
          ),
        )
      }
    } catch {
      return rejectTransition(
        instance,
        frozenEvent,
        diagnostic(
          StatechartDiagnosticCodes.GUARD_FAILED,
          `guard failed while evaluating event "${frozenEvent.type}"`,
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
          `reducer failed while handling event "${frozenEvent.type}"`,
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
          `reducer returned invalid context for event "${frozenEvent.type}"`,
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
    updatedAt: now,
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
    const delivered = (observer as (value: typeof result) => unknown)(result)
    if (delivered !== null && (typeof delivered === 'object' || typeof delivered === 'function')) {
      const then = (delivered as { then?: unknown }).then
      if (typeof then === 'function') {
        void Promise.resolve(delivered).catch(() => undefined)
        return Object.freeze({
          diagnostic: diagnostic(
            StatechartDiagnosticCodes.OBSERVER_FAILED,
            'statechart observer must be synchronous',
          ),
          status: 'rejected',
        })
      }
    }
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
