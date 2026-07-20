import { describe, expect, it } from 'vitest'

import {
  createStatechartInstance,
  defineStatechart,
  restoreStatechart,
  serializeStatechart,
} from '../src'
import type { JsonObject, StatechartEvent } from '../src'

describe('snapshot module', () => {
  it('restores a serialized instance against trusted runtime configuration', () => {
    const definition = defineStatechart<
      JsonObject,
      StatechartEvent<'finish'>,
      'idle'
    >({
      id: 'snapshot-test',
      initial: 'idle',
      parseContext: (input) => input as JsonObject,
      states: { idle: {} },
      version: '1',
    })
    const instance = createStatechartInstance(
      definition,
      { value: 'safe' },
      { instanceId: 'one', now: 'now' },
    )

    expect(restoreStatechart(definition, serializeStatechart(instance))).toEqual({
      instance,
      status: 'restored',
    })
  })

  it('is total over hostile unknown snapshots', () => {
    const definition = defineStatechart<JsonObject, StatechartEvent<'finish'>, 'idle'>({
      id: 'hostile-snapshot',
      initial: 'idle',
      parseContext: (input) => input as JsonObject,
      states: { idle: {} },
      version: '1',
    })
    const getter = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get: () => { throw new Error('must not escape') },
    })
    const proxy = new Proxy({}, {
      ownKeys: () => { throw new Error('must not escape') },
    })

    for (const hostile of [getter, proxy, new Date(), { ...serializeStatechart(
      createStatechartInstance(definition, {}, { instanceId: 'one', now: 'now' }),
    ), updatedAt: ' ' }]) {
      const result = restoreStatechart(definition, hostile)
      expect(result).toMatchObject({ status: 'rejected' })
      expect(Object.isFrozen(result)).toBe(true)
    }
  })
})
