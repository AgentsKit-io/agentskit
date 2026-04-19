import type { ChatMemory, Message } from '@agentskit/core'

/**
 * Client-side encrypted ChatMemory wrapper. Keys never leave the
 * caller — the backing store only ever sees an opaque
 * `{ iv, ct }` payload stashed in `metadata.ciphertext` and
 * `metadata.iv`; `content` becomes an empty string so rogue
 * middleware can't peek at it either.
 *
 * Uses Web Crypto (AES-GCM, 256-bit). Available on Node 20+ and all
 * modern browsers. BYO key material — typically generated per-user
 * during onboarding and stored only on their device.
 */

export interface EncryptedMemoryOptions {
  backing: ChatMemory
  /** 32-byte raw key (e.g. `crypto.getRandomValues(new Uint8Array(32))`). */
  key: Uint8Array | CryptoKey
  /** Override for tests. Defaults to `globalThis.crypto.subtle`. */
  subtle?: SubtleCrypto
  /** Random source. Defaults to `globalThis.crypto.getRandomValues`. */
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T
  /** Optional AAD — content that binds ciphertext to context (user id, room). */
  aad?: Uint8Array
}

export interface EncryptedEnvelope {
  ciphertext: string
  iv: string
  /** Plaintext-length marker so the agent sees a non-empty content hint. */
  length: number
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'))
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function resolveKey(
  subtle: SubtleCrypto,
  material: Uint8Array | CryptoKey,
): Promise<CryptoKey> {
  if ('type' in material && material.type === 'secret') return material
  const raw = material as Uint8Array
  if (raw.byteLength !== 32) {
    throw new Error(`createEncryptedMemory: key must be 32 bytes (got ${raw.byteLength})`)
  }
  return subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function createEncryptedMemory(
  options: EncryptedMemoryOptions,
): Promise<ChatMemory> {
  const subtle = options.subtle ?? globalThis.crypto?.subtle
  const random = options.getRandomValues ?? (<T extends ArrayBufferView>(v: T) => globalThis.crypto.getRandomValues(v as ArrayBufferView as ArrayBufferView & { buffer: ArrayBuffer }) as T)
  if (!subtle) throw new Error('createEncryptedMemory: SubtleCrypto not available')

  const key = await resolveKey(subtle, options.key)
  const aad = options.aad

  const encrypt = async (plain: string): Promise<EncryptedEnvelope> => {
    const iv = random(new Uint8Array(12))
    const data = new TextEncoder().encode(plain)
    const params: AesGcmParams = aad
      ? { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource }
      : { name: 'AES-GCM', iv: iv as BufferSource }
    const cipher = await subtle.encrypt(params, key, data as BufferSource)
    return {
      ciphertext: toBase64(new Uint8Array(cipher)),
      iv: toBase64(iv as Uint8Array),
      length: plain.length,
    }
  }

  const decrypt = async (envelope: EncryptedEnvelope): Promise<string> => {
    const iv = fromBase64(envelope.iv) as BufferSource
    const params: AesGcmParams = aad
      ? { name: 'AES-GCM', iv, additionalData: aad as BufferSource }
      : { name: 'AES-GCM', iv }
    const plain = await subtle.decrypt(params, key, fromBase64(envelope.ciphertext) as BufferSource)
    return new TextDecoder().decode(plain)
  }

  const encryptMessage = async (m: Message): Promise<Message> => {
    if (m.metadata?.agentskitEncrypted) return m
    const envelope = await encrypt(m.content ?? '')
    return {
      ...m,
      content: '',
      metadata: {
        ...(m.metadata ?? {}),
        agentskitEncrypted: true,
        ciphertext: envelope.ciphertext,
        iv: envelope.iv,
        length: envelope.length,
      },
    }
  }

  const decryptMessage = async (m: Message): Promise<Message> => {
    if (!m.metadata?.agentskitEncrypted) return m
    const envelope: EncryptedEnvelope = {
      ciphertext: String(m.metadata.ciphertext),
      iv: String(m.metadata.iv),
      length: Number(m.metadata.length ?? 0),
    }
    const content = await decrypt(envelope)
    const { agentskitEncrypted: _, ciphertext: __, iv: ___, length: ____, ...rest } = m.metadata
    return { ...m, content, metadata: Object.keys(rest).length > 0 ? rest : undefined }
  }

  return {
    async load() {
      const stored = await options.backing.load()
      return Promise.all(stored.map(decryptMessage))
    },
    async save(messages) {
      const encrypted = await Promise.all(messages.map(encryptMessage))
      await options.backing.save(encrypted)
    },
    async clear() {
      await options.backing.clear?.()
    },
  }
}
