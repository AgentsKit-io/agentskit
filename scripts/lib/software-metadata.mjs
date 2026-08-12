import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEcosystemManifest } from './ecosystem-contract.mjs'

function quoteYaml(value) {
  return JSON.stringify(value)
}

export function buildSoftwareMetadata(root) {
  const manifest = parseEcosystemManifest(JSON.parse(readFileSync(join(root, 'ecosystem.json'), 'utf8')))
  const corePackage = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8'))
  const product = manifest.products.find(({ id }) => id === 'agentskit')
  const metadata = product.metadata
  const repository = `https://github.com/${product.repo}`
  const issues = `${repository}/issues`
  const licenseUrl = `${repository}/blob/main/LICENSE`
  const organizationId = `${product.surfaces.home}/#org`
  const sourceId = `${product.surfaces.home}/#source`
  const applicationId = `${product.surfaces.home}/#software`
  const author = {
    '@type': 'Person',
    name: `${metadata.author.givenName} ${metadata.author.familyName}`,
    givenName: metadata.author.givenName,
    familyName: metadata.author.familyName,
    url: metadata.author.url,
  }
  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: manifest.parentBrand.name,
    url: product.surfaces.home,
    logo: {
      '@type': 'ImageObject',
      url: `${product.surfaces.home}/apple-touch-icon.png`,
      width: 180,
      height: 180,
    },
    sameAs: [repository, 'https://www.npmjs.com/org/agentskit'],
  }
  const sourceCode = {
    '@type': 'SoftwareSourceCode',
    '@id': sourceId,
    name: product.name,
    alternateName: metadata.alternateName,
    description: metadata.description,
    codeRepository: repository,
    url: product.surfaces.home,
    mainEntityOfPage: product.surfaces.docs,
    license: licenseUrl,
    version: corePackage.version,
    dateCreated: metadata.dateCreated,
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: metadata.runtimePlatform,
    applicationCategory: metadata.applicationCategory,
    keywords: metadata.keywords,
    author,
    publisher: { '@id': organizationId },
    issueTracker: issues,
  }
  const application = {
    '@type': 'SoftwareApplication',
    '@id': applicationId,
    name: product.name,
    alternateName: metadata.alternateName,
    description: metadata.description,
    applicationCategory: metadata.applicationCategory,
    operatingSystem: 'Cross-platform',
    softwareVersion: corePackage.version,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: product.surfaces.home,
    downloadUrl: 'https://www.npmjs.com/org/agentskit',
    license: licenseUrl,
    author,
    publisher: { '@id': organizationId },
    isBasedOn: { '@id': sourceId },
    keywords: metadata.keywords,
  }
  const codemeta = {
    '@context': 'https://w3id.org/codemeta/3.1',
    '@type': 'SoftwareSourceCode',
    '@id': sourceId,
    name: product.name,
    alternateName: metadata.alternateName,
    description: metadata.description,
    codeRepository: repository,
    issueTracker: issues,
    url: product.surfaces.home,
    buildInstructions: `${product.surfaces.docs}/get-started/getting-started/installation`,
    license: `https://spdx.org/licenses/${metadata.license}`,
    version: corePackage.version,
    dateCreated: metadata.dateCreated,
    developmentStatus: 'active',
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: metadata.runtimePlatform,
    applicationCategory: metadata.applicationCategory,
    keywords: metadata.keywords,
    author,
    maintainer: author,
    producer: organization,
    relatedLink: [product.surfaces.docs, product.surfaces.llms],
  }
  const citation = [
    'cff-version: 1.2.0',
    `message: ${quoteYaml('If you use AgentsKit in your work, please cite it using this metadata.')}`,
    `title: ${quoteYaml(product.name)}`,
    'type: software',
    'authors:',
    `  - family-names: ${quoteYaml(metadata.author.familyName)}`,
    `    given-names: ${quoteYaml(metadata.author.givenName)}`,
    `    website: ${quoteYaml(metadata.author.url)}`,
    `version: ${quoteYaml(corePackage.version)}`,
    `license: ${metadata.license}`,
    `repository-code: ${quoteYaml(repository)}`,
    `url: ${quoteYaml(product.surfaces.home)}`,
    'keywords:',
    ...metadata.keywords.map((keyword) => `  - ${quoteYaml(keyword)}`),
    '',
  ].join('\n')
  return {
    citation,
    codemeta,
    siteIdentity: { organization, sourceCode, application },
  }
}

export function serializeSoftwareMetadata(metadata) {
  return {
    citation: metadata.citation,
    codemeta: `${JSON.stringify(metadata.codemeta, null, 2)}\n`,
    siteIdentity: `${JSON.stringify(metadata.siteIdentity, null, 2)}\n`,
  }
}
