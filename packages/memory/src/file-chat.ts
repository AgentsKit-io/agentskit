import type { ChatMemory, MemoryRecord } from '@agentskit/core'
import { deserializeMessages, serializeMessages } from '@agentskit/core'

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
    async load() {
      try {
        const fs = await import('node:fs/promises')
        const raw = await fs.readFile(path, 'utf8')
        return deserializeMessages(JSON.parse(raw) as MemoryRecord)
      } catch {
        return []
      }
    },
    async save(messages) {
      const fs = await import('node:fs/promises')
      // Chat history can contain user prompts, API keys passed in messages,
      // and tool outputs. Write with mode 0600 so the file is not readable by
      // other users on shared / multi-tenant hosts (CWE-377/378, CodeQL
      // js/insecure-temporary-file). On Windows the mode is ignored — ACLs
      // inherit from the parent directory, which is the right default.
      await fs.writeFile(
        path,
        JSON.stringify(serializeMessages(messages), null, 2),
        { encoding: 'utf8', mode: 0o600 },
      )
    },
    async clear() {
      try {
        const fs = await import('node:fs/promises')
        await fs.unlink(path)
      } catch {
        // Ignore missing files.
      }
    },
  }
}
