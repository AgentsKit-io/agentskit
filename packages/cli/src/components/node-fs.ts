/**
 * Real Node.js filesystem and network adapters for the RFC-0006 component subsystem.
 *
 * This is the only module that touches `node:fs` or the network on behalf of the
 * scanner, writer, and config I/O — every other module in `components/` accepts the
 * injected interfaces so it stays unit-testable without touching disk.
 *
 * Proxy / custom-CA awareness is a documented follow-up; `nodeFetch` is intentionally
 * minimal and delegates entirely to `globalThis.fetch`.
 */
import { dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { ConfigIo } from './config'
import type { FetchLike } from './fetch'
import type { WriteFs } from './install'
import type { ScanFs } from './scan'

/**
 * `ScanFs` backed by the real Node.js filesystem.
 * `readFile` returns `null` on ENOENT or any other read error rather than throwing.
 */
export function nodeScanFs(): ScanFs {
  return {
    readFile(path: string): string | null {
      try {
        return readFileSync(path, 'utf8')
      } catch {
        return null
      }
    },
    exists(path: string): boolean {
      return existsSync(path)
    },
  }
}

/**
 * `WriteFs` backed by the real Node.js filesystem.
 * `write` creates all ancestor directories before writing (equivalent to `mkdir -p`).
 * `remove` is force/silent so it does not throw when the file is already absent
 * (rollback paths call it after a partial write and must not double-fault).
 */
export function nodeWriteFs(): WriteFs {
  return {
    exists(path: string): boolean {
      return existsSync(path)
    },
    write(path: string, content: string): void {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content, 'utf8')
    },
    remove(path: string): void {
      rmSync(path, { force: true })
    },
  }
}

/**
 * `ConfigIo` backed by the real Node.js filesystem.
 * `read` mirrors `nodeScanFs().readFile`; `write` mirrors `nodeWriteFs().write`
 * (creates parent directories as needed).
 */
export function nodeConfigIo(): ConfigIo {
  return {
    read(path: string): string | null {
      try {
        return readFileSync(path, 'utf8')
      } catch {
        return null
      }
    },
    write(path: string, content: string): void {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content, 'utf8')
    },
  }
}

/**
 * Minimal `FetchLike` that delegates to `globalThis.fetch`.
 *
 * Proxy / custom-CA support (e.g. `HTTPS_PROXY`, `NODE_EXTRA_CA_CERTS`) is a
 * documented follow-up; wire an undici `ProxyAgent` here when that slice lands.
 */
export const nodeFetch: FetchLike = async (
  url: string,
  init?: { headers?: Record<string, string> },
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> => {
  const res = await globalThis.fetch(url, { headers: init?.headers })
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
  }
}
