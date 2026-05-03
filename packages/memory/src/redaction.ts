import type {
  ChatMemory,
  Message,
  VectorDocument,
  VectorMemory,
} from '@agentskit/core'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import {
  createPIIRedactor,
  tokenize,
  type PIIRule,
  type RedactionAuditSink,
  type RedactionVault,
} from '@agentskit/core/security'

/**
 * Wrap any `ChatMemory` so PII is redacted (or tokenized) on every
 * `save()`. Works with the in-memory, file, sqlite, turso, and redis
 * chat memories. `load()` and `clear()` are passthrough — reveal
 * happens at read time via `@agentskit/core/security` `reveal()`,
 * not inside the memory.
 *
 * `mode: 'redact'` (default) replaces matches with the rules' bracket
 * markers — irreversible. `mode: 'tokenize'` replaces matches with
 * opaque `<<piitoken:…>>` markers and stores originals in the vault
 * so role-gated `reveal()` can recover them.
 *
 * Closes the memory-write half of issue #791.
 */

export type RedactionMode = 'redact' | 'tokenize'

export interface ChatMemoryRedactionOptions {
  /**
   * Rules to apply. Pass `DEFAULT_PII_RULES` for the baseline set,
   * `compilePIITaxonomy(json)` for a custom JSON taxonomy, or any
   * hand-rolled `PIIRule[]`. Same shape as `createPIIRedactor`.
   */
  rules: PIIRule[]
  mode?: RedactionMode
  /** Required when `mode === 'tokenize'`. */
  vault?: RedactionVault
  /** Roles allowed to reveal — required when `mode === 'tokenize'`. */
  allowedRoles?: string[]
  /** Optional audit sink threaded into the vault `tokenize()` calls. */
  audit?: RedactionAuditSink
}

export interface VectorMemoryRedactionOptions extends ChatMemoryRedactionOptions {}

async function transform(
  input: string,
  opts: ChatMemoryRedactionOptions,
): Promise<string> {
  if (opts.mode === 'tokenize') {
    if (!opts.vault) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'wrapMemoryWithRedaction: vault is required when mode is "tokenize"',
      })
    }
    if (!opts.allowedRoles) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'wrapMemoryWithRedaction: allowedRoles is required when mode is "tokenize"',
      })
    }
    const result = await tokenize(input, {
      rules: opts.rules,
      vault: opts.vault,
      allowedRoles: opts.allowedRoles,
      audit: opts.audit,
    })
    return result.value
  }
  return createPIIRedactor({ rules: opts.rules }).redact(input).value
}

export function wrapChatMemoryWithRedaction(
  inner: ChatMemory,
  options: ChatMemoryRedactionOptions,
): ChatMemory {
  return {
    load: () => inner.load(),
    save: async messages => {
      const redacted: Message[] = await Promise.all(
        messages.map(async m => ({
          ...m,
          content: await transform(m.content ?? '', options),
        })),
      )
      await inner.save(redacted)
    },
    clear: inner.clear ? () => inner.clear!() : undefined,
  }
}

/**
 * Wrap any `VectorMemory` so each document's `content` is redacted (or
 * tokenized) before `store()`. `search()` and `delete()` pass through.
 *
 * Note: embeddings pass through verbatim. Customers who embed
 * plaintext PII separately (e.g. via a hosted embedding provider)
 * must redact the input to their embedder, not just to this wrapper.
 */
export function wrapVectorMemoryWithRedaction(
  inner: VectorMemory,
  options: VectorMemoryRedactionOptions,
): VectorMemory {
  return {
    store: async docs => {
      const redacted: VectorDocument[] = await Promise.all(
        docs.map(async d => ({
          ...d,
          content: await transform(d.content, options),
        })),
      )
      await inner.store(redacted)
    },
    search: (embedding, opts) => inner.search(embedding, opts),
    delete: inner.delete ? ids => inner.delete!(ids) : undefined,
  }
}
