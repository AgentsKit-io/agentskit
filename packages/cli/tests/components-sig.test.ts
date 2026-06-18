import { createHash, generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  makeSignatureVerifier,
  parseMinisignPublicKey,
  parseMinisignSignature,
  verifyMinisign,
} from '../src/components/sig'
import { IntegrityError } from '../src/components/install'

/** Raw 32-byte Ed25519 public key from a KeyObject. */
function rawPublicKey(publicKey: KeyObject): Buffer {
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string }
  return Buffer.from(jwk.x, 'base64url')
}

function pubContent(keyId: Buffer, raw: Buffer): string {
  const payload = Buffer.concat([Buffer.from('Ed', 'latin1'), keyId, raw])
  return `untrusted comment: minisign public key\n${payload.toString('base64')}\n`
}

function sigContent(algorithm: 'Ed' | 'ED', keyId: Buffer, signature: Buffer): string {
  const payload = Buffer.concat([Buffer.from(algorithm, 'latin1'), keyId, signature])
  return (
    `untrusted comment: signature\n${payload.toString('base64')}\n` +
    `trusted comment: timestamp\n${Buffer.alloc(64).toString('base64')}\n`
  )
}

const KEY_ID = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])
const MESSAGE = '{"id":"docs-chat","version":"1.0.0"}'

function freshKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return { publicKey, privateKey, raw: rawPublicKey(publicKey) }
}

describe('minisign parsing', () => {
  it('round-trips public key and signature payloads', () => {
    const { raw } = freshKey()
    const pk = parseMinisignPublicKey(pubContent(KEY_ID, raw))
    expect(pk.algorithm).toBe('Ed')
    expect(pk.keyId.equals(KEY_ID)).toBe(true)
    expect(pk.publicKey.equals(raw)).toBe(true)

    const sg = parseMinisignSignature(sigContent('ED', KEY_ID, Buffer.alloc(64, 7)))
    expect(sg.algorithm).toBe('ED')
    expect(sg.signature.length).toBe(64)
  })

  it('throws IntegrityError on malformed input', () => {
    expect(() => parseMinisignPublicKey('only one line')).toThrow(IntegrityError)
    expect(() => parseMinisignPublicKey('comment\nnotbase64!!!@@@')).toThrow(IntegrityError)
    expect(() => parseMinisignSignature(`comment\n${Buffer.alloc(10).toString('base64')}`)).toThrow(IntegrityError)
  })
})

describe('verifyMinisign', () => {
  it('verifies a legacy (Ed) signature over the raw bytes', () => {
    const { privateKey, raw } = freshKey()
    const signature = cryptoSign(null, Buffer.from(MESSAGE, 'utf8'), privateKey)
    expect(verifyMinisign(MESSAGE, sigContent('Ed', KEY_ID, signature), pubContent(KEY_ID, raw))).toBe(true)
  })

  it('verifies a prehashed (ED) signature over blake2b-512', () => {
    const { privateKey, raw } = freshKey()
    const digest = createHash('blake2b512').update(Buffer.from(MESSAGE, 'utf8')).digest()
    const signature = cryptoSign(null, digest, privateKey)
    expect(verifyMinisign(MESSAGE, sigContent('ED', KEY_ID, signature), pubContent(KEY_ID, raw))).toBe(true)
  })

  it('rejects a tampered message, a wrong key id, and an unknown algorithm', () => {
    const { privateKey, raw } = freshKey()
    const signature = cryptoSign(null, Buffer.from(MESSAGE, 'utf8'), privateKey)
    const pub = pubContent(KEY_ID, raw)

    expect(verifyMinisign(`${MESSAGE} tampered`, sigContent('Ed', KEY_ID, signature), pub)).toBe(false)
    const otherId = Buffer.from([9, 9, 9, 9, 9, 9, 9, 9])
    expect(verifyMinisign(MESSAGE, sigContent('Ed', otherId, signature), pub)).toBe(false)
    expect(verifyMinisign(MESSAGE, sigContent('Xx' as 'Ed', KEY_ID, signature), pub)).toBe(false)
  })

  it('rejects a signature from a different key', () => {
    const signer = freshKey()
    const attackerSig = cryptoSign(null, Buffer.from(MESSAGE, 'utf8'), signer.privateKey)
    const victim = freshKey()
    // Same key id framing but the published key is the victim's → must fail.
    expect(verifyMinisign(MESSAGE, sigContent('Ed', KEY_ID, attackerSig), pubContent(KEY_ID, victim.raw))).toBe(false)
  })
})

describe('makeSignatureVerifier (fetch seam)', () => {
  it('returns a verifier that accepts valid and rejects invalid/malformed', async () => {
    const { privateKey, raw } = freshKey()
    const signature = cryptoSign(null, Buffer.from(MESSAGE, 'utf8'), privateKey)
    const verify = makeSignatureVerifier(pubContent(KEY_ID, raw))

    await expect(verify(MESSAGE, sigContent('Ed', KEY_ID, signature))).resolves.toBe(true)
    await expect(verify(MESSAGE, 'garbage')).resolves.toBe(false)
    await expect(verify('different manifest', sigContent('Ed', KEY_ID, signature))).resolves.toBe(false)
  })
})
