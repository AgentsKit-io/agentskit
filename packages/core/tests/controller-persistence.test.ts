import { describe, expect, it, vi } from 'vitest'
import { createControllerPersistence } from '../src/controller-persistence'
import { ErrorCodes, MemoryError } from '../src/errors'
import type { Message } from '../src/types'

const messages: Message[] = [{
  id: 'm1', role: 'user', content: 'hello', status: 'complete', createdAt: new Date(0),
}]

describe('createControllerPersistence', () => {
  it('isolates save/load/clear and emits save evidence', async () => {
    const memory = {
      load: vi.fn(async () => messages),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    }
    const onSave = vi.fn()
    const onError = vi.fn()
    const persistence = createControllerPersistence(() => memory, { onSave, onError })

    await persistence.save(messages)
    await expect(persistence.load()).resolves.toEqual(messages)
    await persistence.clear()
    expect(memory.save).toHaveBeenCalledWith(messages)
    expect(onSave).toHaveBeenCalledWith(1)
    expect(onError).not.toHaveBeenCalled()
    expect(memory.clear).toHaveBeenCalledOnce()
  })

  it('wraps load failures and reports save failures without throwing', async () => {
    const loadFailure = new Error('read failed')
    const saveFailure = new Error('write failed')
    const onError = vi.fn()
    const persistence = createControllerPersistence(() => ({
      load: async () => { throw loadFailure },
      save: async () => { throw saveFailure },
    }), { onSave: vi.fn(), onError })

    await expect(persistence.load()).rejects.toMatchObject({ code: 'AK_MEMORY_LOAD_FAILED', cause: loadFailure })
    await expect(persistence.save(messages)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'AK_MEMORY_SAVE_FAILED', cause: saveFailure }))
  })

  it('preserves typed memory load errors', async () => {
    const typed = new MemoryError({ code: ErrorCodes.AK_MEMORY_DESERIALIZE_FAILED, message: 'typed' })
    const persistence = createControllerPersistence(() => ({ load: async () => { throw typed }, save: async () => {} }), { onSave: vi.fn(), onError: vi.fn() })
    await expect(persistence.load()).rejects.toBe(typed)
  })
})
