import { createSearchAPI, type Index } from 'fumadocs-core/search/server'
import { source } from '@/lib/source'
import { getRegistryIndex } from '@/lib/registry'
import { resolveStructuredData, structuredText } from '@/lib/docs-text'

async function indexes(): Promise<Index[]> {
  const [agents] = await Promise.all([getRegistryIndex()])
  const docs: Index[] = await Promise.all(source.getPages().map(async (page) => ({
    title: page.data.title,
    description: page.data.description,
    breadcrumbs: ['Docs'],
    content: structuredText(await resolveStructuredData(page.data)),
    keywords: `documentation guide ${page.slugs.join(' ')}`,
    url: page.url,
  })))
  const agentIndexes: Index[] = agents.map((agent) => ({
    title: agent.title,
    description: agent.description,
    breadcrumbs: ['Agents', agent.category],
    content: `${agent.title} ${agent.description} ${(agent.tags ?? []).join(' ')}`,
    keywords: `${agent.id} ${agent.category} ${(agent.tags ?? []).join(' ')}`,
    url: `/agents/${agent.id}`,
  }))
  return [...agentIndexes, ...docs]
}

export const { GET } = createSearchAPI('simple', { indexes })
