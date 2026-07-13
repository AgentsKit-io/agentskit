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
})
