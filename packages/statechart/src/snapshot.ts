import { cloneJsonObject } from './json'
import { parseStatechartContext } from './statechart'
import {
  STATECHART_SNAPSHOT_VERSION,
  StatechartDiagnosticCodes,
} from './types'
import type {
  DeepReadonly,
  JsonObject,
  RejectedRestore,
  StatechartDefinition,
  StatechartDiagnostic,
  StatechartEvent,
  StatechartInstance,
  StatechartRestoreResult,
  StatechartSnapshot,
} from './types'

const diagnostic = (
  code: StatechartDiagnostic['code'],
  message: string,
): StatechartDiagnostic => Object.freeze({ code, message })

const hasOwn = (input: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(input, key)

const rejectRestore = (
  code: StatechartDiagnostic['code'],
  message: string,
): RejectedRestore => Object.freeze({
  diagnostic: diagnostic(code, message),
  status: 'rejected',
})

/**
 * Create a frozen, versioned snapshot from an instance.
 *
 * @param instance The instance to serialize.
 * @returns A JSON-compatible snapshot tagged with the current schema version.
 * @example
 * ```ts
 * const snapshot = serializeStatechart(instance)
 * ```
 */
export const serializeStatechart = <
  TContext extends JsonObject,
  TState extends string,
>(
  instance: StatechartInstance<TContext, TState>,
): StatechartSnapshot<TContext, TState> =>
  Object.freeze({
    context: cloneJsonObject<TContext>(instance.context),
    instanceId: instance.instanceId,
    machineId: instance.machineId,
    machineVersion: instance.machineVersion,
    revision: instance.revision,
    schemaVersion: STATECHART_SNAPSHOT_VERSION,
    state: instance.state,
    updatedAt: instance.updatedAt,
  })

/**
 * Validate untrusted snapshot data and restore an instance when it matches a definition.
 *
 * @param definition The definition the snapshot must belong to.
 * @param input Untrusted serialized snapshot data.
 * @returns A restored instance or a rejection diagnostic; malformed snapshots do not throw.
 * @example
 * ```ts
 * const restored = restoreStatechart(machine, JSON.parse(savedSnapshot))
 * if (restored.status === 'restored') use(restored.instance)
 * ```
 */
export const restoreStatechart = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  definition: StatechartDefinition<TContext, TEvent, TState>,
  input: unknown,
): StatechartRestoreResult<TContext, TState> => {
  let snapshot: DeepReadonly<JsonObject>
  try {
    snapshot = cloneJsonObject(input)
  } catch {
    return rejectRestore(
      StatechartDiagnosticCodes.SNAPSHOT_INVALID,
      'snapshot must be a JSON-compatible object',
    )
  }

  if (snapshot.schemaVersion !== STATECHART_SNAPSHOT_VERSION) {
    return rejectRestore(
      StatechartDiagnosticCodes.SNAPSHOT_VERSION_UNSUPPORTED,
      'snapshot schema version is unsupported',
    )
  }

  if (
    snapshot.machineId !== definition.id ||
    snapshot.machineVersion !== definition.version
  ) {
    return rejectRestore(
      StatechartDiagnosticCodes.INSTANCE_MISMATCH,
      'snapshot does not belong to this statechart definition',
    )
  }

  if (
    typeof snapshot.instanceId !== 'string' ||
    snapshot.instanceId.trim().length === 0 ||
    typeof snapshot.updatedAt !== 'string' ||
    snapshot.updatedAt.trim().length === 0 ||
    typeof snapshot.state !== 'string' ||
    !hasOwn(definition.states, snapshot.state) ||
    typeof snapshot.revision !== 'number' ||
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < 0
  ) {
    return rejectRestore(
      StatechartDiagnosticCodes.SNAPSHOT_INVALID,
      'snapshot metadata is invalid',
    )
  }

  try {
    const instance: StatechartInstance<TContext, TState> = Object.freeze({
      context: parseStatechartContext(definition, snapshot.context),
      instanceId: snapshot.instanceId,
      machineId: definition.id,
      machineVersion: definition.version,
      revision: snapshot.revision,
      state: snapshot.state as TState,
      updatedAt: snapshot.updatedAt,
    })
    return Object.freeze({ instance, status: 'restored' })
  } catch {
    return rejectRestore(
      StatechartDiagnosticCodes.CONTEXT_INVALID,
      'snapshot context failed runtime validation',
    )
  }
}
