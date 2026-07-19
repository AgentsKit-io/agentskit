import type { ChatMemory, MemoryRecord } from '@agentskit/core'
import { deserializeMessages, serializeMessages } from '@agentskit/core'

type MemoryOperationOptions = Parameters<ChatMemory['load']>[0]

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

function throwIfAborted(options?: MemoryOperationOptions): void {
  options?.signal?.throwIfAborted()
}

/**
 * ChatMemory backed by a JSON file on disk. Node-only.
 *
 * Implements the Memory contract (ADR 0003):
 * - load() returns a snapshot (CM1)
 * - save() is replace-all, not append (CM2)
 * - empty state returns [] (CM5)
 * - clear() is optional but provided here
 */
export function fileChatMemory(path: string): ChatMemory {
  return {
    async load(options?: MemoryOperationOptions) {
      throwIfAborted(options)
      try {
        const fs = await import('node:fs/promises')
        throwIfAborted(options)
        const raw = await fs.readFile(path, {
          encoding: 'utf8',
          signal: options?.signal,
        })
        return deserializeMessages(JSON.parse(raw) as MemoryRecord)
      } catch (err) {
        throwIfAborted(options)
        if (isAbortError(err)) throw err
        return []
      }
    },
    async save(messages, options?: MemoryOperationOptions) {
      throwIfAborted(options)
      const [fs, crypto, pathUtils] = await Promise.all([
        import('node:fs/promises'),
        import('node:crypto'),
        import('node:path'),
      ])
      throwIfAborted(options)
      const payload = JSON.stringify(serializeMessages(messages), null, 2)
      throwIfAborted(options)

      // Same-directory temp + rename for CM4 atomicity. Unique suffix so
      // concurrent saves never share a temp path. mode 0600 so chat history
      // (prompts, keys, tool outputs) is not world-readable on multi-tenant
      // hosts; Windows ignores mode and inherits parent ACLs.
      const tempPath = pathUtils.join(
        pathUtils.dirname(path),
        `.${pathUtils.basename(path)}.${crypto.randomBytes(16).toString('hex')}.tmp`,
      )
      try {
        await fs.writeFile(tempPath, payload, {
          encoding: 'utf8',
          mode: 0o600,
          signal: options?.signal,
        })
        throwIfAborted(options)
        await fs.rename(tempPath, path)
      } finally {
        try {
          await fs.unlink(tempPath)
        } catch {
          // Best-effort: temp may already be published via rename, or never created.
        }
      }
    },
    async clear(options?: MemoryOperationOptions) {
      throwIfAborted(options)
      try {
        const fs = await import('node:fs/promises')
        throwIfAborted(options)
        await fs.unlink(path)
      } catch (err) {
        throwIfAborted(options)
        if (isAbortError(err)) throw err
        // Ignore missing files.
      }
    },
  }
}
