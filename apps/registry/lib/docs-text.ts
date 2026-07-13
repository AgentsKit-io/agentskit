type DocData = {
  structuredData?: unknown | (() => Promise<unknown>)
  load?: () => Promise<{ structuredData?: unknown }>
}

export async function resolveStructuredData(data: DocData): Promise<unknown> {
  if (typeof data.structuredData === 'function') return data.structuredData()
  if (data.structuredData) return data.structuredData
  return (await data.load?.())?.structuredData
}

export function structuredText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(structuredText).filter(Boolean).join('\n')
  if (value && typeof value === 'object') return Object.values(value).map(structuredText).filter(Boolean).join('\n')
  return ''
}
