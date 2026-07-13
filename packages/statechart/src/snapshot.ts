import { cloneJsonObject } from './json'
import { parseStatechartContext } from './statechart'
import {
  STATECHART_SNAPSHOT_VERSION,
  StatechartDiagnosticCodes,
} from './types'
import type {
  JsonObject,
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

const isRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input)

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

export const restoreStatechart = <
  TContext extends JsonObject,
  TEvent extends StatechartEvent,
  TState extends string,
>(
  definition: StatechartDefinition<TContext, TEvent, TState>,
  input: unknown,
): StatechartRestoreResult<TContext, TState> => {
  if (!isRecord(input)) {
    return {
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.SNAPSHOT_INVALID,
        'snapshot must be an object',
      ),
      status: 'rejected',
    }
  }

  if (input.schemaVersion !== STATECHART_SNAPSHOT_VERSION) {
    return {
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.SNAPSHOT_VERSION_UNSUPPORTED,
        'snapshot schema version is unsupported',
      ),
      status: 'rejected',
    }
  }

  if (
    input.machineId !== definition.id ||
    input.machineVersion !== definition.version
  ) {
    return {
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.INSTANCE_MISMATCH,
        'snapshot does not belong to this statechart definition',
      ),
      status: 'rejected',
    }
  }

  if (
    typeof input.instanceId !== 'string' ||
    input.instanceId.length === 0 ||
    typeof input.updatedAt !== 'string' ||
    input.updatedAt.length === 0 ||
    typeof input.state !== 'string' ||
    !hasOwn(definition.states, input.state) ||
    typeof input.revision !== 'number' ||
    !Number.isSafeInteger(input.revision) ||
    input.revision < 0
  ) {
    return {
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.SNAPSHOT_INVALID,
        'snapshot metadata is invalid',
      ),
      status: 'rejected',
    }
  }

  try {
    const instance: StatechartInstance<TContext, TState> = Object.freeze({
      context: parseStatechartContext(definition, input.context),
      instanceId: input.instanceId,
      machineId: definition.id,
      machineVersion: definition.version,
      revision: input.revision,
      state: input.state as TState,
      updatedAt: input.updatedAt,
    })
    return Object.freeze({ instance, status: 'restored' })
  } catch {
    return {
      diagnostic: diagnostic(
        StatechartDiagnosticCodes.CONTEXT_INVALID,
        'snapshot context failed runtime validation',
      ),
      status: 'rejected',
    }
  }
}
