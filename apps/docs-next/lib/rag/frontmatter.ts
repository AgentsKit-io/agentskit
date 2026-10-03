import { splitFrontmatter } from '@agentskit/cross-platform/pure'
import { parse as parseYaml } from 'yaml'

export interface ParsedFrontmatter {
  title?: string
  body: string
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const { frontmatter, body } = splitFrontmatter(raw)
  if (frontmatter === null) return { body }

  const data: unknown = parseYaml(frontmatter)
  const title =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? Reflect.get(data, 'title')
      : undefined

  return typeof title === 'string' ? { title: title.trim(), body } : { body }
}
