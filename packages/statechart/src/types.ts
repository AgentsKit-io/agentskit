/** A JSON scalar supported in statechart contexts and snapshots. */
export type JsonPrimitive = boolean | null | number | string

/** A recursively JSON-compatible value. */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

/** A JSON-compatible object used as statechart context. */
export type JsonObject = { [key: string]: JsonValue }

/** A type with every nested property and array element marked readonly. */
export type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : never

/** An event that can be evaluated by a statechart transition. */
export interface StatechartEvent<
  TType extends string = string,
  TPayload extends JsonValue = JsonValue,
> {
  readonly id?: string
  readonly payload?: TPayload
  readonly type: TType
}

type EventOfType<TEvent, TType extends string> = TEvent extends { readonly type: TType }
  ? TEvent
  : never

/** A state change target with optional synchronous guard and context reducer. */
export interface StatechartTransition<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly guard?: (
    context: DeepReadonly<TContext>,
    event: DeepReadonly<TEvent>,
  ) => boolean
  readonly reduce?: (
    context: DeepReadonly<TContext>,
    event: DeepReadonly<TEvent>,
  ) => TContext
  readonly target: TState
}

/** Transitions indexed by the event types accepted by a state. */
export type StatechartTransitionMap<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> = {
  readonly [TType in TEvent['type']]?: StatechartTransition<
    TContext,
    EventOfType<TEvent, TType>,
    TState
  >
}

/** The transitions available while a statechart is in one state. */
export interface StatechartState<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly on?: StatechartTransitionMap<TContext, TEvent, TState>
}

/** The unbranded input used to define a statechart. */
export interface StatechartDefinitionInput<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly id: string
  readonly initial: TState
  readonly parseContext: (input: unknown) => TContext
  readonly states: Readonly<
    Record<TState, StatechartState<TContext, TEvent, TState>>
  >
  readonly version: string
}

declare const statechartDefinitionBrand: unique symbol

/** A validated, frozen statechart definition returned by `defineStatechart`. */
export type StatechartDefinition<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> = StatechartDefinitionInput<TContext, TEvent, TState> & {
  readonly [statechartDefinitionBrand]: true
}

/** An immutable statechart state and its validated context at a revision. */
export interface StatechartInstance<
  TContext extends JsonObject,
  TState extends string,
> {
  readonly context: DeepReadonly<TContext>
  readonly instanceId: string
  readonly machineId: string
  readonly machineVersion: string
  readonly revision: number
  readonly state: TState
  readonly updatedAt: string
}

/** Stable caller-supplied metadata used to create an instance. */
export interface StatechartCreationOptions {
  readonly instanceId: string
  readonly now: string
}

/** Caller-supplied time metadata used when evaluating a transition. */
export interface StatechartTransitionOptions {
  readonly now: string
}

/** Stable diagnostic codes returned by statechart operations. */
export const StatechartDiagnosticCodes = {
  CONTEXT_INVALID: 'AK_STATECHART_CONTEXT_INVALID',
  DEFINITION_INVALID: 'AK_STATECHART_DEFINITION_INVALID',
  GUARD_FAILED: 'AK_STATECHART_GUARD_FAILED',
  GUARD_REJECTED: 'AK_STATECHART_GUARD_REJECTED',
  INPUT_INVALID: 'AK_STATECHART_INPUT_INVALID',
  INSTANCE_MISMATCH: 'AK_STATECHART_INSTANCE_MISMATCH',
  OBSERVER_FAILED: 'AK_STATECHART_OBSERVER_FAILED',
  REDUCER_FAILED: 'AK_STATECHART_REDUCER_FAILED',
  SNAPSHOT_INVALID: 'AK_STATECHART_SNAPSHOT_INVALID',
  SNAPSHOT_VERSION_UNSUPPORTED: 'AK_STATECHART_SNAPSHOT_VERSION_UNSUPPORTED',
  TRANSITION_UNAVAILABLE: 'AK_STATECHART_TRANSITION_UNAVAILABLE',
} as const

/** A code identifying a statechart validation or execution diagnostic. */
export type StatechartDiagnosticCode =
  (typeof StatechartDiagnosticCodes)[keyof typeof StatechartDiagnosticCodes]

/** A stable error code and human-readable message from a statechart operation. */
export interface StatechartDiagnostic {
  readonly code: StatechartDiagnosticCode
  readonly message: string
}

/**
 * An exception raised when a statechart definition or instance input is invalid.
 * @param diagnostic The validation diagnostic associated with the error.
 */
export class StatechartError extends Error {
  readonly code: StatechartDiagnosticCode

  constructor(diagnostic: StatechartDiagnostic) {
    super(diagnostic.message)
    this.name = 'StatechartError'
    this.code = diagnostic.code
  }
}

/** The result of an accepted transition, including the new instance. */
export interface AcceptedTransition<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly event: DeepReadonly<TEvent>
  readonly from: TState
  readonly instance: StatechartInstance<TContext, TState>
  readonly status: 'accepted'
  readonly to: TState
}

/** The result of a rejected transition, preserving the current instance. */
export interface RejectedTransition<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly diagnostic: StatechartDiagnostic
  readonly event: DeepReadonly<TEvent>
  readonly from: TState
  readonly instance: StatechartInstance<TContext, TState>
  readonly status: 'rejected'
}

/** The accepted or rejected result returned by `transitionStatechart`. */
export type StatechartTransitionResult<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> =
  | AcceptedTransition<TContext, TEvent, TState>
  | RejectedTransition<TContext, TEvent, TState>

/** The schema version used by serialized statechart snapshots. */
export const STATECHART_SNAPSHOT_VERSION = 1 as const

/** A JSON-compatible serialized statechart instance. */
export interface StatechartSnapshot<
  TContext extends JsonObject = JsonObject,
  TState extends string = string,
> {
  readonly context: DeepReadonly<TContext>
  readonly instanceId: string
  readonly machineId: string
  readonly machineVersion: string
  readonly revision: number
  readonly schemaVersion: typeof STATECHART_SNAPSHOT_VERSION
  readonly state: TState
  readonly updatedAt: string
}

/** A successfully restored statechart instance. */
export interface RestoredStatechart<
  TContext extends JsonObject,
  TState extends string,
> {
  readonly instance: StatechartInstance<TContext, TState>
  readonly status: 'restored'
}

/** A snapshot restore rejection with a diagnostic explaining the failure. */
export interface RejectedRestore {
  readonly diagnostic: StatechartDiagnostic
  readonly status: 'rejected'
}

/** The successful or rejected result returned by `restoreStatechart`. */
export type StatechartRestoreResult<
  TContext extends JsonObject,
  TState extends string,
> = RestoredStatechart<TContext, TState> | RejectedRestore

/** A synchronous callback invoked with a transition result. */
export type StatechartObserver<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> = (
  result: StatechartTransitionResult<TContext, TEvent, TState>,
) => void

/** The outcome of delivering a transition result to an observer. */
export type StatechartObserverResult =
  | { readonly status: 'delivered' }
  | { readonly diagnostic: StatechartDiagnostic; readonly status: 'rejected' }
