import { createStatechartInstance, defineStatechart } from '@agentskit/statechart'

const toggle = defineStatechart({
  id: 'toggle',
  version: '1',
  initial: 'off',
  parseContext: () => ({}),
  states: { off: { on: { toggle: { target: 'on' } } }, on: {} },
})

const instance = createStatechartInstance(toggle, {}, {
  instanceId: 'toggle-1',
  now: '2026-07-17T12:00:00.000Z',
})

console.log(instance.state)
