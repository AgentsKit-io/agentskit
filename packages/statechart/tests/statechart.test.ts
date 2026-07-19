import { describe, expect, it, vi } from 'vitest'

import {
  STATECHART_SNAPSHOT_VERSION,
  StatechartDiagnosticCodes,
  StatechartError,
  createStatechartInstance,
  defineStatechart,
  notifyStatechartObserver,
  restoreStatechart,
  serializeStatechart,
  transitionStatechart,
} from '../src'
import type { JsonObject, StatechartEvent } from '../src'

type ApprovalContext = {
  approved: boolean
  attempts: number
  summary: string
}

type ApprovalEvent =
  | StatechartEvent<'approve', { reviewer: string }>
  | StatechartEvent<'reject', { reason: string }>
  | StatechartEvent<'retry'>

const parseApprovalContext = (input: unknown): ApprovalContext => {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    typeof (input as Record<string, unknown>).approved !== 'boolean' ||
    typeof (input as Record<string, unknown>).attempts !== 'number' ||
    typeof (input as Record<string, unknown>).summary !== 'string'
  ) {
    throw new TypeError('invalid approval context')
  }

  return input as ApprovalContext
}

const machine = defineStatechart<
  ApprovalContext,
  ApprovalEvent,
  'waiting' | 'approved' | 'rejected'
>({
  id: 'approval',
  initial: 'waiting',
  parseContext: parseApprovalContext,
  states: {
    approved: {},
    rejected: {
      on: {
        retry: {
          reduce: (context) => ({
            ...context,
            attempts: context.attempts + 1,
          }),
          target: 'waiting',
        },
      },
    },
    waiting: {
      on: {
        approve: {
          guard: (_context, event) => event.payload.reviewer.length > 0,
          reduce: (context) => ({ ...context, approved: true }),
          target: 'approved',
        },
        reject: {
          reduce: (context, event) => ({
            ...context,
            summary: event.payload.reason,
          }),
          target: 'rejected',
        },
      },
    },
  },
  version: '1.0.0',
})

const createWaiting = () =>
  createStatechartInstance(
    machine,
    { approved: false, attempts: 0, summary: '' },
    { instanceId: 'approval-1', now: '2026-07-13T12:00:00.000Z' },
  )

describe('definitions and instances', () => {
  it('creates an immutable instance without hidden time or ID generation', () => {
    const instance = createWaiting()

    expect(instance).toEqual({
      context: { approved: false, attempts: 0, summary: '' },
      instanceId: 'approval-1',
      machineId: 'approval',
      machineVersion: '1.0.0',
      revision: 0,
      state: 'waiting',
      updatedAt: '2026-07-13T12:00:00.000Z',
    })
    expect(Object.isFrozen(machine)).toBe(true)
    expect(Object.isFrozen(machine.states.waiting.on?.approve)).toBe(true)
    expect(Object.isFrozen(instance.context)).toBe(true)
  })

  it.each([
    {
      initial: 'missing',
      states: { waiting: {} },
      expected: 'initial state',
    },
    {
      initial: 'waiting',
      states: { waiting: { on: { go: { target: 'missing' } } } },
      expected: 'targets unknown state',
    },
  ])('rejects an invalid definition', ({ initial, states, expected }) => {
    expect(() =>
      defineStatechart<JsonObject, StatechartEvent<'go'>, string>({
        id: 'invalid',
        initial,
        parseContext: (input) => input as JsonObject,
        states,
        version: '1',
      }),
    ).toThrow(expected)
  })

  it('returns a typed error when initial context validation fails', () => {
    expect(() =>
      createStatechartInstance(
        machine,
        { approved: 'yes', attempts: 0, summary: '' },
        { instanceId: 'approval-1', now: 'now' },
      ),
    ).toThrow(
      expect.objectContaining<StatechartError>({
        code: StatechartDiagnosticCodes.CONTEXT_INVALID,
      }),
    )
  })

  it('rejects non-JSON context even when a parser returns it', () => {
    const unsafe = defineStatechart<JsonObject, StatechartEvent<'go'>, 'idle'>({
      id: 'unsafe',
      initial: 'idle',
      parseContext: () => ({ value: Number.NaN }),
      states: { idle: {} },
      version: '1',
    })

    expect(() =>
      createStatechartInstance(unsafe, {}, { instanceId: '1', now: 'now' }),
    ).toThrow(
      expect.objectContaining({
        code: StatechartDiagnosticCodes.CONTEXT_INVALID,
      }),
    )
  })

  it('supports prototype-sensitive state and event names without pollution', () => {
    type HostileState = '__proto__' | 'done'
    type HostileEvent = StatechartEvent<'__proto__'>
    const states = Object.create(null) as Record<HostileState, Record<string, unknown>>
    const transitions = Object.create(null) as Record<string, unknown>
    transitions.__proto__ = { target: 'done' }
    states.__proto__ = { on: transitions }
    states.done = {}

    const hostile = defineStatechart<JsonObject, HostileEvent, HostileState>({
      id: 'hostile-names',
      initial: '__proto__',
      parseContext: (input) => input as JsonObject,
      states,
      version: '1',
    })
    const result = transitionStatechart(
      hostile,
      createStatechartInstance(hostile, {}, { instanceId: 'one', now: 'zero' }),
      { type: '__proto__' },
      { now: 'one' },
    )

    expect(Object.getPrototypeOf(hostile.states)).toBeNull()
    expect(Object.getPrototypeOf(hostile.states.__proto__.on)).toBeNull()
    expect(result).toMatchObject({ status: 'accepted', to: 'done' })
    expect(({} as { target?: string }).target).toBeUndefined()
  })

  it.each([
    [null, 'definition'],
    [{ id: 1, initial: 'idle', parseContext: (input: unknown) => input, states: { idle: {} }, version: '1' }, 'id'],
    [{ id: 'x', initial: 'idle', parseContext: null, states: { idle: {} }, version: '1' }, 'parseContext'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: [], version: '1' }, 'states'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: { idle: null }, version: '1' }, 'plain object'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: { idle: { on: [] } }, version: '1' }, 'transitions'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: { idle: { on: { go: null } } }, version: '1' }, 'transition'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: { idle: { on: { go: { guard: 'yes', target: 'idle' } } } }, version: '1' }, 'guard'],
    [{ id: 'x', initial: 'idle', parseContext: (input: unknown) => input, states: { idle: { on: { go: { reduce: 'yes', target: 'idle' } } } }, version: '1' }, 'reducer'],
  ])('rejects malformed runtime definitions with typed diagnostics', (input, message) => {
    expect(() => defineStatechart(input as never)).toThrow(
      expect.objectContaining({ code: StatechartDiagnosticCodes.DEFINITION_INVALID }),
    )
    expect(() => defineStatechart(input as never)).toThrow(message)
  })

  it('rejects unsafe definition accessors without invoking them', () => {
    const getter = vi.fn(() => ({}))
    const states = {}
    Object.defineProperty(states, 'idle', { enumerable: true, get: getter })
    expect(() => defineStatechart({
      id: 'accessor',
      initial: 'idle',
      parseContext: (input) => input as JsonObject,
      states,
      version: '1',
    } as never)).toThrow(expect.objectContaining({ code: StatechartDiagnosticCodes.DEFINITION_INVALID }))
    expect(getter).not.toHaveBeenCalled()
  })

  it('rejects top-level definition accessors without invoking them', () => {
    const getter = vi.fn(() => 'secret')
    const definition = {
      initial: 'idle',
      parseContext: (input: unknown) => input,
      states: { idle: {} },
      version: '1',
    }
    Object.defineProperty(definition, 'id', { enumerable: true, get: getter })

    expect(() => defineStatechart(definition as never)).toThrow(
      expect.objectContaining({ code: StatechartDiagnosticCodes.DEFINITION_INVALID }),
    )
    expect(getter).not.toHaveBeenCalled()
  })

  it('uses input diagnostics for invalid creation metadata', () => {
    expect(() => createStatechartInstance(machine, {}, { instanceId: ' ', now: 'now' })).toThrow(
      expect.objectContaining({ code: StatechartDiagnosticCodes.INPUT_INVALID }),
    )
    expect(() => createStatechartInstance(machine, {}, { instanceId: 'one', now: '' })).toThrow(
      expect.objectContaining({ code: StatechartDiagnosticCodes.INPUT_INVALID }),
    )
  })
})

describe('transitionStatechart', () => {
  it('accepts a transition and returns a new instance', () => {
    const before = createWaiting()
    const result = transitionStatechart(
      machine,
      before,
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: '2026-07-13T12:01:00.000Z' },
    )

    expect(result.status).toBe('accepted')
    if (result.status !== 'accepted') return
    expect(result.instance).not.toBe(before)
    expect(before.context.approved).toBe(false)
    expect(result.instance).toMatchObject({
      context: { approved: true },
      revision: 1,
      state: 'approved',
      updatedAt: '2026-07-13T12:01:00.000Z',
    })
  })

  it('returns the unchanged instance for unavailable and duplicate events', () => {
    const before = createWaiting()
    const first = transitionStatechart(
      machine,
      before,
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )
    if (first.status !== 'accepted') throw new Error('expected acceptance')

    const duplicate = transitionStatechart(
      machine,
      first.instance,
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'two' },
    )

    expect(duplicate).toMatchObject({
      diagnostic: {
        code: StatechartDiagnosticCodes.TRANSITION_UNAVAILABLE,
      },
      instance: first.instance,
      status: 'rejected',
    })
  })

  it('turns guard refusal and exceptions into typed rejections', () => {
    const refused = transitionStatechart(
      machine,
      createWaiting(),
      { type: 'approve', payload: { reviewer: '' } },
      { now: 'one' },
    )
    expect(refused).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.GUARD_REJECTED },
      status: 'rejected',
    })

    const guardFailure = defineStatechart<JsonObject, StatechartEvent<'go'>, 'idle'>({
      id: 'guard-failure',
      initial: 'idle',
      parseContext: (input) => input as JsonObject,
      states: {
        idle: {
          on: {
            go: {
              guard: () => {
                throw new Error('not public')
              },
              target: 'idle',
            },
          },
        },
      },
      version: '1',
    })
    const result = transitionStatechart(
      guardFailure,
      createStatechartInstance(guardFailure, {}, { instanceId: '1', now: '0' }),
      { type: 'go' },
      { now: '1' },
    )
    expect(result).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.GUARD_FAILED },
      status: 'rejected',
    })
    expect(JSON.stringify(result)).not.toContain('not public')
  })

  it('distinguishes reducer exceptions from invalid reducer output', () => {
    const makeMachine = (reduce: () => JsonObject) =>
      defineStatechart<JsonObject, StatechartEvent<'go'>, 'idle'>({
        id: 'reducer',
        initial: 'idle',
        parseContext: (input) => input as JsonObject,
        states: { idle: { on: { go: { reduce, target: 'idle' } } } },
        version: '1',
      })

    const throwing = makeMachine(() => {
      throw new Error('secret cause')
    })
    const invalid = makeMachine(() => ({ value: Number.POSITIVE_INFINITY }))

    const invoke = (definition: typeof throwing) =>
      transitionStatechart(
        definition,
        createStatechartInstance(definition, {}, { instanceId: '1', now: '0' }),
        { type: 'go' },
        { now: '1' },
      )

    expect(invoke(throwing)).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.REDUCER_FAILED },
      status: 'rejected',
    })
    expect(invoke(invalid)).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.CONTEXT_INVALID },
      status: 'rejected',
    })
  })

  it('rejects an instance from a different definition', () => {
    const foreign = { ...createWaiting(), machineVersion: '2.0.0' }
    const result = transitionStatechart(
      machine,
      foreign,
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )
    expect(result).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.INSTANCE_MISMATCH },
      status: 'rejected',
    })
  })

  it('rejects malformed events and timestamps without invoking accessors', () => {
    const getter = vi.fn(() => 'approve')
    const event = {}
    Object.defineProperty(event, 'type', { enumerable: true, get: getter })
    const invalidEvent = transitionStatechart(machine, createWaiting(), event as never, { now: 'one' })
    const invalidTime = transitionStatechart(
      machine,
      createWaiting(),
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: ' ' },
    )

    expect(getter).not.toHaveBeenCalled()
    expect(invalidEvent).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.INPUT_INVALID },
      event: { type: '' },
      status: 'rejected',
    })
    expect(invalidTime).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.INPUT_INVALID },
      status: 'rejected',
    })
  })

  it('rejects malformed instance metadata and safe-integer overflow', () => {
    const invalidState = transitionStatechart(
      machine,
      { ...createWaiting(), state: 'toString' } as never,
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )
    const overflow = transitionStatechart(
      machine,
      { ...createWaiting(), revision: Number.MAX_SAFE_INTEGER },
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )

    expect(invalidState).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.INSTANCE_MISMATCH },
      status: 'rejected',
    })
    expect(overflow).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.INPUT_INVALID },
      status: 'rejected',
    })
  })

  it('prevents guards and reducers from mutating transition inputs', () => {
    const mutating = defineStatechart<JsonObject, StatechartEvent<'guard'> | StatechartEvent<'reduce'>, 'idle'>({
      id: 'mutating',
      initial: 'idle',
      parseContext: (input) => input as JsonObject,
      states: {
        idle: {
          on: {
            guard: {
              guard: (context) => {
                ;(context as { value?: string }).value = 'changed'
                return true
              },
              target: 'idle',
            },
            reduce: {
              reduce: (_context, event) => {
                ;(event as { type: string }).type = 'changed'
                return {}
              },
              target: 'idle',
            },
          },
        },
      },
      version: '1',
    })
    const instance = createStatechartInstance(mutating, {}, { instanceId: 'one', now: 'zero' })

    expect(transitionStatechart(mutating, instance, { type: 'guard' }, { now: 'one' })).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.GUARD_FAILED },
      status: 'rejected',
    })
    expect(transitionStatechart(mutating, instance, { type: 'reduce' }, { now: 'one' })).toMatchObject({
      diagnostic: { code: StatechartDiagnosticCodes.REDUCER_FAILED },
      status: 'rejected',
    })
  })
})

describe('snapshots and replay', () => {
  it('round-trips through a versioned snapshot', () => {
    const snapshot = serializeStatechart(createWaiting())
    const restored = restoreStatechart(machine, JSON.parse(JSON.stringify(snapshot)))

    expect(snapshot.schemaVersion).toBe(STATECHART_SNAPSHOT_VERSION)
    expect(restored).toEqual({ instance: createWaiting(), status: 'restored' })
  })

  it.each([
    [null, StatechartDiagnosticCodes.SNAPSHOT_INVALID],
    [{ schemaVersion: 99 }, StatechartDiagnosticCodes.SNAPSHOT_VERSION_UNSUPPORTED],
    [
      { ...serializeStatechart(createWaiting()), machineVersion: '2' },
      StatechartDiagnosticCodes.INSTANCE_MISMATCH,
    ],
    [
      { ...serializeStatechart(createWaiting()), revision: -1 },
      StatechartDiagnosticCodes.SNAPSHOT_INVALID,
    ],
    [
      {
        ...serializeStatechart(createWaiting()),
        context: { approved: 'yes', attempts: 0, summary: '' },
      },
      StatechartDiagnosticCodes.CONTEXT_INVALID,
    ],
  ])('rejects malformed or incompatible snapshots', (snapshot, code) => {
    expect(restoreStatechart(machine, snapshot)).toEqual({
      diagnostic: expect.objectContaining({ code }),
      status: 'rejected',
    })
  })

  it('produces equivalent output when restored and replayed', () => {
    const initial = createWaiting()
    const direct = transitionStatechart(
      machine,
      initial,
      { type: 'reject', payload: { reason: 'Needs evidence' } },
      { now: '2026-07-13T12:01:00.000Z' },
    )
    const restored = restoreStatechart(machine, serializeStatechart(initial))
    if (restored.status !== 'restored') throw new Error('expected restore')
    const replayed = transitionStatechart(
      machine,
      restored.instance,
      { type: 'reject', payload: { reason: 'Needs evidence' } },
      { now: '2026-07-13T12:01:00.000Z' },
    )

    expect(replayed).toEqual(direct)
  })
})

describe('observers', () => {
  it('delivers accepted and rejected results outside the transition core', () => {
    const observer = vi.fn()
    const result = transitionStatechart(
      machine,
      createWaiting(),
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )

    expect(observer).not.toHaveBeenCalled()
    expect(notifyStatechartObserver(observer, result)).toEqual({
      status: 'delivered',
    })
    expect(observer).toHaveBeenCalledWith(result)
  })

  it('isolates observer failures from state', () => {
    const result = transitionStatechart(
      machine,
      createWaiting(),
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )
    const before = result.instance
    const delivered = notifyStatechartObserver(() => {
      throw new Error('observer failure')
    }, result)

    expect(delivered).toEqual({
      diagnostic: {
        code: StatechartDiagnosticCodes.OBSERVER_FAILED,
        message: 'statechart observer failed',
      },
      status: 'rejected',
    })
    expect(result.instance).toBe(before)
  })

  it('rejects async observers and consumes their rejection', async () => {
    const result = transitionStatechart(
      machine,
      createWaiting(),
      { type: 'approve', payload: { reviewer: 'Ada' } },
      { now: 'one' },
    )
    const unhandled = vi.fn()
    process.once('unhandledRejection', unhandled)

    expect(notifyStatechartObserver(async () => {
      throw new Error('private async failure')
    }, result)).toEqual({
      diagnostic: {
        code: StatechartDiagnosticCodes.OBSERVER_FAILED,
        message: 'statechart observer must be synchronous',
      },
      status: 'rejected',
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.removeListener('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })
})
