import { defineDocs, defineCollections, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config'
import { z } from 'zod'

export const docs = defineDocs({
  dir: 'content/docs',
})

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    date: z.string(),
    author: z.string().default('AgentsKit.js'),
    tags: z.array(z.string()).default([]),
  }),
})

export default defineConfig()
