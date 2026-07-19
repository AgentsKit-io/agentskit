export type JsonPrimitive = boolean | null | number | string

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : never

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

export interface StatechartState<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> {
  readonly on?: StatechartTransitionMap<TContext, TEvent, TState>
}

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

export type StatechartDefinition<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> = StatechartDefinitionInput<TContext, TEvent, TState> & {
  readonly [statechartDefinitionBrand]: true
}

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

export interface StatechartCreationOptions {
  readonly instanceId: string
  readonly now: string
}

export interface StatechartTransitionOptions {
  readonly now: string
}

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

export type StatechartDiagnosticCode =
  (typeof StatechartDiagnosticCodes)[keyof typeof StatechartDiagnosticCodes]

export interface StatechartDiagnostic {
  readonly code: StatechartDiagnosticCode
  readonly message: string
}

export class StatechartError extends Error {
  readonly code: StatechartDiagnosticCode

  constructor(diagnostic: StatechartDiagnostic) {
    super(diagnostic.message)
    this.name = 'StatechartError'
    this.code = diagnostic.code
  }
}

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

export type StatechartTransitionResult<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> =
  | AcceptedTransition<TContext, TEvent, TState>
  | RejectedTransition<TContext, TEvent, TState>

export const STATECHART_SNAPSHOT_VERSION = 1 as const

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

export interface RestoredStatechart<
  TContext extends JsonObject,
  TState extends string,
> {
  readonly instance: StatechartInstance<TContext, TState>
  readonly status: 'restored'
}

export interface RejectedRestore {
  readonly diagnostic: StatechartDiagnostic
  readonly status: 'rejected'
}

export type StatechartRestoreResult<
  TContext extends JsonObject,
  TState extends string,
> = RestoredStatechart<TContext, TState> | RejectedRestore

export type StatechartObserver<
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
> = (
  result: StatechartTransitionResult<TContext, TEvent, TState>,
) => void

export type StatechartObserverResult =
  | { readonly status: 'delivered' }
  | { readonly diagnostic: StatechartDiagnostic; readonly status: 'rejected' }
