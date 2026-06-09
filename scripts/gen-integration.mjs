#!/usr/bin/env node
// Scaffold a new service integration from the _template directory.
//   pnpm gen:integration <name>
// <name> must be a kebab-case slug matching the OS ConnectionKind, e.g. `cal-com`.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG = path.resolve(__dirname, '../packages/integrations')
const TEMPLATE = path.join(PKG, 'src/services/_template')
const SERVICES = path.join(PKG, 'src/services')

function toCamel(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}
function toPascal(slug) {
  const camel = toCamel(slug)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

async function main() {
  const name = process.argv[2]
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('usage: pnpm gen:integration <kebab-case-name>')
    process.exit(1)
  }

  const dest = path.join(SERVICES, name)
  if (await fs.stat(dest).then(() => true).catch(() => false)) {
    console.error(`service "${name}" already exists at ${dest}`)
    process.exit(1)
  }

  const camel = toCamel(name) // value tokens: templateAuth -> <camel>Auth
  const pascal = toPascal(name) // displayName
  const replace = (s) =>
    s
      .replaceAll('template', camel)
      .replaceAll('Template', pascal)
      .replaceAll('TEMPLATE', name.toUpperCase().replaceAll('-', '_'))

  await fs.mkdir(dest, { recursive: true })
  for (const file of await fs.readdir(TEMPLATE)) {
    const body = await fs.readFile(path.join(TEMPLATE, file), 'utf8')
    await fs.writeFile(path.join(dest, file), replace(body))
  }

  // Set the descriptor `name` to the real slug (replace defaults to camelCase).
  const indexPath = path.join(dest, 'index.ts')
  let index = await fs.readFile(indexPath, 'utf8')
  index = index.replace(/name: '[^']*',/, `name: '${name}',`)
  await fs.writeFile(indexPath, index)

  // Append the side-effect import to the service barrel.
  const barrelPath = path.join(SERVICES, 'index.ts')
  const barrel = await fs.readFile(barrelPath, 'utf8')
  const importLine = `import './${name}'\n`
  if (!barrel.includes(importLine)) {
    await fs.writeFile(barrelPath, barrel.replace(/export \{\}\n?/, '') + importLine)
  }

  console.log(`✓ created packages/integrations/src/services/${name}`)
  console.log('  next: fill in actions.ts / triggers.ts / auth.ts, then add a contract test.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
