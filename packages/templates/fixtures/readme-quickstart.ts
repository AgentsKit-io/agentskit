import { createToolTemplate } from '@agentskit/templates'

const echo = createToolTemplate({
  name: 'echo',
  description: 'Echo a string back',
  schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  execute: async (args) => String(args.text),
})

console.log(echo.name)
