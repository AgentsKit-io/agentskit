#!/usr/bin/env node
/**
 * Fast semantic-authority gate for public product surfaces.
 * It checks identity/distribution boundaries and catches stale claims without
 * rewriting content or treating private AKOS implementation as public proof.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relative) => readFileSync(join(root, relative), 'utf8')
const manifest = JSON.parse(read('ecosystem.json'))
const claims = JSON.parse(read('ecosystem-claims.json'))
const diagnostics = []

const publicProducts = manifest.products.filter((product) => product.public)
const openSourceProducts = publicProducts.filter((product) => product.distributionClass === 'open-source')
const managedProducts = manifest.products.filter((product) => product.distributionClass === 'managed-service')
const agentskitClaims = claims.products.find((product) => product.productId === 'agentskit')
const packageClaim = agentskitClaims?.claims?.find((claim) => claim.id === 'packages')

if (openSourceProducts.length !== 6) diagnostics.push(`expected six public open-source products, found ${openSourceProducts.length}`)
if (managedProducts.length !== 1 || managedProducts[0]?.id !== 'akos') diagnostics.push('expected exactly one managed product: akos')
if (managedProducts[0]?.public !== false || managedProducts[0]?.repo !== null) diagnostics.push('AKOS must remain private and repository-less in the public manifest')
if (!packageClaim || typeof packageClaim.value !== 'number') diagnostics.push('agentskit package claim is missing or not numeric')

const publicFiles = [
  'README.md',
  'packages/core/README.md',
  'apps/docs-next/components/home/reference-journey.tsx',
  'apps/docs-next/app/(home)/page.tsx',
  'apps/landing/app/_components/ecosystem.tsx',
  'apps/landing/app/layout.tsx',
  'apps/registry/README.md',
  'apps/registry/content/docs/for-agents.mdx',
  'llms.txt',
]
for (const relative of publicFiles) {
  const content = read(relative)
  if (/AgentsKit OS|\b5 KB\b/.test(content)) diagnostics.push(`${relative} contains a retired public term or size claim`)
}

const readme = read('README.md')
if (packageClaim && !readme.includes(`${packageClaim.value} focused packages`)) {
  diagnostics.push(`README.md does not use the verified package count: ${packageClaim.value}`)
}
if (packageClaim && !readme.includes(`**${packageClaim.value} published packages**`)) {
  diagnostics.push(`README.md verified proof does not use the package count: ${packageClaim.value}`)
}

const llms = read('llms.txt')
if (/\]\((?:apps|docs|packages)\//.test(llms)) diagnostics.push('llms.txt contains repository-relative links')
if (/\[(?:peer|peers|or):\]/.test(llms)) diagnostics.push('llms.txt contains an unlabeled relationship marker')
if (!/\[AKOS\]\(https:\/\/akos\.agentskit\.io\/?\)/.test(llms)) diagnostics.push('llms.txt does not expose AKOS as a labeled canonical URL')
if (!/not required to use the open-source products/.test(llms)) diagnostics.push('llms.txt does not state that AKOS is optional')

const docsEcosystem = read('apps/docs-next/app/ecosystem/page.tsx')
if (docsEcosystem.includes('agentskit-io.github.io/doc-bridge')) diagnostics.push('docs ecosystem page uses the retired Doc Bridge host')

const landingLayout = read('apps/landing/app/layout.tsx')
if (!landingLayout.includes("'@type': 'ItemList'") || !landingLayout.includes("'@type': 'SoftwareSourceCode'") || !landingLayout.includes("'@type': 'Service'")) {
  diagnostics.push('landing JSON-LD must distinguish the OSS product list from the managed AKOS service')
}

const ecosystemPage = read('apps/docs-next/app/ecosystem/page.tsx')
if (!ecosystemPage.includes('ECOSYSTEM_JSON_LD') || !ecosystemPage.includes("'@type': 'ItemList'") || !ecosystemPage.includes("'@type': 'Service'")) {
  diagnostics.push('ecosystem hub JSON-LD must expose the product list and managed-service distinction')
}

const registryHome = read("apps/registry/app/(home)/page.tsx")
if (!registryHome.includes("'@type': 'CollectionPage'") || !registryHome.includes("'@type': 'ItemList'") || !registryHome.includes('agents.map')) {
  diagnostics.push('registry home JSON-LD must expose its real agent collection as an ItemList')
}

if (diagnostics.length > 0) {
  console.error(`semantic authority check failed:\n${diagnostics.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}

console.log(`semantic authority check passed: ${openSourceProducts.length} public OSS products, ${managedProducts.length} optional managed layer, package claim ${packageClaim.value}`)
