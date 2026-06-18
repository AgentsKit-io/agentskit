/**
 * `agentskit add <component>` orchestrator (RFC-0006 install flow).
 *
 * The capstone that wires the component subsystem into one transactional install:
 *   scan → resolve config → fetch manifest → validate → fetch+verify files →
 *   commit (path-guarded, rollback) → write marker → append audit chain.
 *
 * Pure orchestration over injected adapters (filesystem, network, clock) so the
 * whole flow is unit-testable end-to-end with no real I/O. The CLI command layer
 * supplies the real `node:fs`/`fetch` adapters and the interactive prompts; this
 * module makes none of those decisions itself.
 */
import { join } from 'node:path'
import type { FrameworkTarget, RegistryEnvVar } from './types'
import { type ScanFs, scanProject } from './scan'
import { type ConfigIo, CONFIG_PATH, resolveConfig, writeConfig } from './config'
import { fetchManifest, fetchPortFiles, type FetchLike } from './fetch'
import { validateInstall, type ValidationIssue } from './validate'
import { type WriteFs, commitFiles, IntegrityError } from './install'
import {
  appendAudit,
  buildInstalledComponent,
  parseAuditLog,
  serializeAuditLog,
  upsertInstalled,
} from './marker'

/** Audit log path, relative to the project (or workspace package) root. */
export const AUDIT_PATH = '.agentskit/install-log.jsonl'

/** Injected adapters — real `node:fs`/`fetch` in the command, fakes in tests. */
export interface AddDeps {
  scanFs: ScanFs
  /** Read/write for `components.json` and the audit log. */
  io: ConfigIo
  /** File install surface (write + remove for rollback). */
  writeFs: WriteFs
  /** Network. Defaults to global fetch. */
  fetchImpl?: FetchLike
  /** Injected clock → deterministic markers/audit. */
  now: () => string
  env?: Record<string, string | undefined>
}

export interface AddOptions {
  identifier: string
  root?: string
  /** `--out` install dir override. Defaults to the port's `defaultTarget`. */
  outDir?: string
  /** Overwrite existing files instead of aborting on conflict. */
  force?: boolean
  /** `--registry` base override. */
  registryBase?: string
  /** Optional signed-manifest verifier (e.g. `makeSignatureVerifier(SHIPPED_KEY)`). */
  signatureVerifier?: (manifestRaw: string, signatureRaw: string) => Promise<boolean>
}

export interface AddResult {
  id: string
  version: string
  installPath: string
  framework: FrameworkTarget
  /** Absolute paths written. */
  written: string[]
  /** npm packages the component composes (install these). */
  packages: string[]
  /** Env the component needs. */
  env: RegistryEnvVar[]
  /** Non-blocking validation warnings (rate-limit, styling, …). */
  warnings: ValidationIssue[]
  /** Whether config came from a committed components.json (vs derived → suggest init). */
  configFromDisk: boolean
}

/** Merge a project's declared dependency versions for the peer-range check. */
function installedVersions(scanFs: ScanFs, root: string): Record<string, string> {
  const raw = scanFs.readFile(join(root, 'package.json'))
  if (raw == null) return {}
  try {
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
    return { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies }
  } catch {
    return {}
  }
}

/**
 * Install a component end-to-end. Throws {@link IntegrityError} (with the joined
 * messages) when validation fails or any integrity check trips — leaving nothing
 * written (commit is transactional). On success the marker + audit chain are
 * persisted and an {@link AddResult} is returned for the command to print.
 */
export async function addComponent(options: AddOptions, deps: AddDeps): Promise<AddResult> {
  const root = options.root ?? '.'

  // 1 — scan + resolve config.
  const scan = scanProject(deps.scanFs, root)
  const { config, fromDisk } = resolveConfig(deps.io, scan, root)

  // 2 — fetch + integrity/version-gate the manifest.
  const { ref, component } = await fetchManifest(options.identifier, {
    fetchImpl: deps.fetchImpl,
    env: deps.env,
    config,
    registryBase: options.registryBase,
    signatureVerifier: options.signatureVerifier,
  })

  // 3 — validate against the detected project (framework, peers, runtime, …).
  const validation = validateInstall({
    scan,
    component,
    installed: installedVersions(deps.scanFs, root),
  })
  if (!validation.ok || !validation.port) {
    const errors = validation.issues.filter((i) => i.severity === 'error').map((i) => i.message)
    throw new IntegrityError(`cannot install ${component.id}: ${errors.join('; ') || 'no compatible port'}`)
  }
  const port = validation.port

  // 4 — fetch + checksum every port file.
  const files = await fetchPortFiles(ref, port, { fetchImpl: deps.fetchImpl, env: deps.env, config })

  // 5 — transactional, path-guarded commit.
  const installPath = options.outDir ?? port.defaultTarget
  const { written } = commitFiles(deps.writeFs, installPath, files, { force: options.force })

  // 6 — record the marker on components.json.
  const framework: FrameworkTarget = {
    uiBinding: port.uiBinding,
    metaFramework: scan.metaFramework === 'unknown' ? config.metaFramework : scan.metaFramework,
  }
  const now = deps.now()
  const marker = buildInstalledComponent({
    id: component.id,
    framework,
    installPath,
    ref: ref.base,
    version: component.version,
    files,
    now,
  })
  writeConfig(deps.io, upsertInstalled(config, marker), root)

  // 7 — append the tamper-evident audit entry.
  const auditPath = join(root, AUDIT_PATH)
  const prev = parseAuditLog(deps.io.read(auditPath) ?? '')
  const entry = appendAudit(prev, {
    schemaVersion: 1,
    eventType: 'install',
    id: component.id,
    version: component.version,
    ref: ref.base,
    files: files.map((f) => ({ path: f.path, sha256: marker.files[f.path]!.sha })),
    manifestSigRef: options.signatureVerifier ? `${ref.itemId}.minisig` : '',
    timestamp: now,
  })
  deps.io.write(auditPath, serializeAuditLog([...prev, entry]))

  return {
    id: component.id,
    version: component.version,
    installPath,
    framework,
    written,
    packages: [...component.packages, ...(port.packages ?? [])],
    env: component.env ?? [],
    warnings: validation.issues.filter((i) => i.severity === 'warning'),
    configFromDisk: fromDisk,
  }
}

/** Re-export so the command can reference where config/audit live. */
export { CONFIG_PATH }
