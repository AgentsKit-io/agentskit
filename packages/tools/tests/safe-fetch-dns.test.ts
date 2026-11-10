import { describe, expect, it } from 'vitest'
import { isPrivateHost } from '../src/safe-fetch'

describe('Node DNS egress checks', () => {
  it('fails closed when a reserved .invalid hostname does not resolve', async () => {
    await expect(isPrivateHost('agentskit-net03.invalid')).resolves.toBe(true)
  })
})
