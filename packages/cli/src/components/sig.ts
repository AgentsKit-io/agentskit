/**
 * Minisign signature verification (RFC-0006 D9).
 *
 * Implements the `signatureVerifier` seam the fetch client injects: verify a
 * minisign (Ed25519) detached signature over the registry manifest, against a
 * public key shipped with the CLI. Supports both minisign signature kinds —
 * legacy `Ed` (signs the raw bytes) and prehashed `ED` (signs BLAKE2b-512 of the
 * bytes) — and checks the key id matches before verifying.
 *
 * minisign wire format (the base64 payload on line 2 of each file):
 *   public key:  algorithm[2 "Ed"] · key_id[8] · ed25519_public_key[32]   (42 bytes)
 *   signature:   algorithm[2 "Ed"|"ED"] · key_id[8] · ed25519_signature[64] (74 bytes)
 * Line 1 is the "untrusted comment". The signature file's trusted-comment global
 * signature (lines 3–4) protects the comment only and is not needed to verify the
 * payload, so it is ignored here.
 *
 * Uses only `node:crypto` (Ed25519 + blake2b512) — no external `minisign` binary.
 */
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { IntegrityError } from './install'

export interface MinisignPublicKey {
  algorithm: string
  keyId: Buffer
  publicKey: Buffer
}

export interface MinisignSignature {
  algorithm: string
  keyId: Buffer
  signature: Buffer
}

/** The base64 payload of a minisign file is its second non-empty line. */
function payloadLine(content: string): Buffer {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) throw new IntegrityError('malformed minisign file: missing payload line')
  try {
    return Buffer.from(lines[1]!.trim(), 'base64')
  } catch {
    throw new IntegrityError('malformed minisign file: payload is not valid base64')
  }
}

export function parseMinisignPublicKey(content: string): MinisignPublicKey {
  const buf = payloadLine(content)
  if (buf.length !== 42) throw new IntegrityError(`malformed minisign public key: expected 42 bytes, got ${buf.length}`)
  return {
    algorithm: buf.subarray(0, 2).toString('latin1'),
    keyId: buf.subarray(2, 10),
    publicKey: buf.subarray(10, 42),
  }
}

export function parseMinisignSignature(content: string): MinisignSignature {
  const buf = payloadLine(content)
  if (buf.length !== 74) throw new IntegrityError(`malformed minisign signature: expected 74 bytes, got ${buf.length}`)
  return {
    algorithm: buf.subarray(0, 2).toString('latin1'),
    keyId: buf.subarray(2, 10),
    signature: buf.subarray(10, 74),
  }
}

/** Build an Ed25519 public KeyObject from the raw 32-byte key (via JWK OKP). */
function ed25519PublicKey(raw: Buffer): ReturnType<typeof createPublicKey> {
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: raw.toString('base64url') },
    format: 'jwk',
  })
}

function verifyEd25519(message: Buffer, signature: Buffer, rawPublicKey: Buffer): boolean {
  try {
    return cryptoVerify(null, message, ed25519PublicKey(rawPublicKey), signature)
  } catch {
    return false
  }
}

/**
 * Verify a minisign signature over `message` against `publicKeyContent`. Returns
 * false (never throws on a bad signature) when the key id mismatches, the
 * algorithm is unknown, or the Ed25519 check fails. Throws {@link IntegrityError}
 * only when a file is structurally malformed.
 */
export function verifyMinisign(
  message: Buffer | string,
  signatureContent: string,
  publicKeyContent: string,
): boolean {
  const pub = parseMinisignPublicKey(publicKeyContent)
  const sig = parseMinisignSignature(signatureContent)
  if (!sig.keyId.equals(pub.keyId)) return false

  const bytes = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8')
  let signed: Buffer
  if (sig.algorithm === 'ED') {
    // Prehashed: minisign signs BLAKE2b-512 of the file.
    signed = createHash('blake2b512').update(bytes).digest()
  } else if (sig.algorithm === 'Ed') {
    // Legacy: signs the raw bytes.
    signed = bytes
  } else {
    return false
  }
  return verifyEd25519(signed, sig.signature, pub.publicKey)
}

/**
 * Build the `signatureVerifier` the fetch client expects, bound to a shipped
 * public key. `(manifestRaw, signatureRaw) => Promise<boolean>`.
 */
export function makeSignatureVerifier(
  publicKeyContent: string,
): (manifestRaw: string, signatureRaw: string) => Promise<boolean> {
  return async (manifestRaw, signatureRaw) => {
    try {
      return verifyMinisign(manifestRaw, signatureRaw, publicKeyContent)
    } catch {
      // A malformed signature/key is a verification failure, not a crash.
      return false
    }
  }
}
