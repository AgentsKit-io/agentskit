import { readFile, readdir } from 'node:fs/promises'
const packagesRoot = new URL('../packages/', import.meta.url)
const releaseWorkflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
const manifests = []

for (const directory of await readdir(packagesRoot)) {
  const path = new URL(`./${directory}/package.json`, packagesRoot)
  try {
    manifests.push({ directory, manifest: JSON.parse(await readFile(path, 'utf8')) })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

const byName = new Map(manifests.map(item => [item.manifest.name, item]))
const diagnostics = []

if (!releaseWorkflow.includes('id-token: write')) diagnostics.push('release workflow must grant id-token: write')
if (!releaseWorkflow.includes('environment: npm')) diagnostics.push('release workflow must use the npm environment')
if (/NPM_TOKEN|NODE_AUTH_TOKEN/.test(releaseWorkflow)) diagnostics.push('release workflow must not depend on saved npm tokens')

for (const { directory, manifest } of manifests) {
  const isPrivate = manifest.private === true
  if (isPrivate && manifest.publishConfig?.access === 'public') {
    diagnostics.push(`${manifest.name}: private package cannot declare public access`)
  }
  if (!isPrivate) {
    if (manifest.publishConfig?.access !== 'public') diagnostics.push(`${manifest.name}: public package must declare publishConfig.access=public`)
    if (manifest.publishConfig?.provenance !== true) diagnostics.push(`${manifest.name}: public package must declare publishConfig.provenance=true`)
    const runtimeDependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    }
    for (const dependency of Object.keys(runtimeDependencies)) {
      const target = byName.get(dependency)
      if (target?.manifest.private === true) diagnostics.push(`${manifest.name}: runtime dependency ${dependency} is private`)
    }
  }
  if (!manifest.name) diagnostics.push(`${directory}: package name is missing`)
}

if (diagnostics.length > 0) throw new Error(`publication surface check failed:\n${diagnostics.map(item => `- ${item}`).join('\n')}`)
console.log(`publication surface check passed: ${manifests.filter(item => item.manifest.private !== true).length} public, ${manifests.filter(item => item.manifest.private === true).length} private`)
