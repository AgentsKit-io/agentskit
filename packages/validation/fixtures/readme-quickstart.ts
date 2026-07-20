import { createAjvValidator } from '@agentskit/tools/validation'

const validate = createAjvValidator()
const result = validate(
  {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  { city: 'Lisbon' },
)

console.log(result.valid)
