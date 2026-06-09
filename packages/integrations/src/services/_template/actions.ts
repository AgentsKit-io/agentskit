import { defineAction } from '../../contract'

// One factory per API call. `http` is already auth-bound — never read the
// credential here. Absorb provider quirks (form bodies, `ok:false`, etc.)
// inside execute so every consumer layer inherits the fix.
export const templatePing = defineAction({
  name: 'template_ping',
  description: 'Example action — replace with a real API call.',
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Text to echo.' },
    },
    required: ['message'],
  },
  sideEffect: 'read',
  async execute(args, http) {
    return http({ method: 'POST', path: '/ping', body: { message: args.message } })
  },
})

export const templateActions = [templatePing]
