import { describe, expect, it } from 'vitest'
import ecosystem from '../lib/ecosystem.json'
import {
  PUBLIC_RESOURCE_STATUSES,
  PUBLIC_RESOURCE_TYPES,
  publicResources,
  resourcesByType,
} from '../lib/public-resources'

const allowedKeys = [
  'id',
  'product',
  'publisher',
  'status',
  'summary',
  'title',
  'topics',
  'type',
  'url',
  'verifiedAt',
].sort()

const forbiddenTerms = [
  'approvedDigest',
  'contactEmail',
  'draftUrl',
  'eventId',
  'internalNotes',
  'receipt',
  'submissionId',
  'traceId',
]

describe('public ecosystem resources', () => {
  it('contains only allowlisted public fields and statuses', () => {
    expect(publicResources.length).toBeGreaterThan(20)

    for (const resource of publicResources) {
      expect(Object.keys(resource).sort()).toEqual(allowedKeys)
      expect(PUBLIC_RESOURCE_TYPES).toContain(resource.type)
      expect(PUBLIC_RESOURCE_STATUSES).toContain(resource.status)
      expect(resource.url).toMatch(/^https:\/\//)
      expect(resource.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(resource.summary.length).toBeGreaterThan(40)
      expect(resource.topics.length).toBeGreaterThan(0)
    }
  })

  it('keeps identifiers and URLs unique', () => {
    const ids = publicResources.map((resource) => resource.id)
    const urls = publicResources.map((resource) => resource.url)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('groups every resource into exactly one visible section', () => {
    const grouped = PUBLIC_RESOURCE_TYPES.flatMap((type) => resourcesByType(type))

    expect(grouped).toHaveLength(publicResources.length)
    expect(new Set(grouped.map((resource) => resource.id)).size).toBe(publicResources.length)
  })

  it('uses canonical ecosystem URLs for official product surfaces', () => {
    const canonicalUrls = new Map(
      ecosystem.products.map((product) => [product.id, new URL(product.surfaces.home).toString()]),
    )

    expect(publicResources.find((resource) => resource.id === 'agentskit-registry')?.url).toBe(
      canonicalUrls.get('registry'),
    )
    expect(publicResources.find((resource) => resource.id === 'agentskit-chat')?.url).toBe(
      canonicalUrls.get('agentskit-chat'),
    )
    expect(publicResources.find((resource) => resource.id === 'doc-bridge')?.url).toBe(
      canonicalUrls.get('doc-bridge'),
    )
    expect(publicResources.find((resource) => resource.id === 'agentskit-playbook')?.url).toBe(
      canonicalUrls.get('playbook'),
    )
  })

  it('keeps the Launch Llama listing and independent publications in the public graph', () => {
    expect(publicResources.find((resource) => resource.id === 'agentskit-launch-llama')).toMatchObject({
      publisher: 'Launch Llama',
      url: 'https://tools.launchllama.co/products/agentskit',
      status: 'published',
      verifiedAt: '2026-08-20',
    })
    expect(publicResources.some((resource) => resource.type === 'article' && resource.publisher === 'DEV Community')).toBe(true)
    expect(publicResources.some((resource) => resource.type === 'article' && resource.publisher === 'Hashnode')).toBe(true)
  })

  it('does not expose private ledger vocabulary', () => {
    const serialized = JSON.stringify(publicResources)

    for (const term of forbiddenTerms) {
      expect(serialized).not.toContain(term)
    }
  })
})
