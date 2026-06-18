/**
 * `agentskit add <name>` — component install path (RFC-0006 D1 auto-detect).
 *
 * Thin glue over `addComponent`: builds the real `node:fs`/network adapters, runs
 * the transactional install, and prints the result. Detection is by trying to
 * fetch a component manifest — if the id isn't a component in the registry
 * (`fetch failed` / `not a component`), this returns `not-a-component` so the
 * caller falls back to the agent path. All other failures (validation, checksum,
 * path-escape) are real component errors and surface to the user.
 */
import { addComponent, type AddResult } from '../components/flow'
import { nodeConfigIo, nodeFetch, nodeScanFs, nodeWriteFs } from '../components/node-fs'
import { IntegrityError } from '../components/install'

export interface ComponentAddOptions {
  out?: string
  force?: boolean
  registry?: string
}

export type ComponentAddOutcome = 'installed' | 'not-a-component'

/** True when the error means "this id is not a registry component" (→ try agent). */
function isNotAComponent(err: unknown): boolean {
  return err instanceof IntegrityError && /fetch failed|is not a component/i.test(err.message)
}

function printReport(result: AddResult): void {
  const { id, version, installPath, framework, written, packages, env, warnings, configFromDisk } = result
  const out = process.stdout
  out.write(`\n✓ Installed ${id}@${version} → ${installPath}/  (${framework.uiBinding} × ${framework.metaFramework})\n`)
  out.write(`  wrote ${written.length} file${written.length === 1 ? '' : 's'}\n`)

  if (packages.length > 0) {
    out.write(`\nInstall the packages it composes:\n  npm install ${packages.join(' ')}\n`)
  }
  const required = env.filter((e) => e.required)
  if (required.length > 0) {
    out.write(`\nRequired environment:\n`)
    for (const e of required) out.write(`  ${e.name} — ${e.description}\n`)
  }
  if (warnings.length > 0) {
    out.write(`\nWarnings:\n`)
    for (const w of warnings) out.write(`  ⚠ ${w.message}\n`)
  }
  if (!configFromDisk) {
    out.write(`\nTip: run \`agentskit init\` to commit .agentskit/components.json and skip the scan next time.\n`)
  }
  out.write('\n')
}

/**
 * Attempt a component install for `name`. Returns `'installed'` on success,
 * `'not-a-component'` when the id is not a registry component (caller should try
 * the agent path). Throws on a genuine component install failure.
 */
export async function tryComponentAdd(
  name: string,
  options: ComponentAddOptions,
): Promise<ComponentAddOutcome> {
  try {
    const result = await addComponent(
      { identifier: name, outDir: options.out, force: options.force === true, registryBase: options.registry },
      {
        scanFs: nodeScanFs(),
        io: nodeConfigIo(),
        writeFs: nodeWriteFs(),
        fetchImpl: nodeFetch,
        now: () => new Date().toISOString(),
        env: process.env,
      },
    )
    printReport(result)
    return 'installed'
  } catch (err) {
    if (isNotAComponent(err)) return 'not-a-component'
    throw err
  }
}
