import { defineDocs, defineCollections, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config'
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins/remark-mdx-mermaid'
import { z } from 'zod'

export const docs = defineDocs({
  dir: 'content/docs',
})

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    date: z.string(),
    author: z.string().default('AgentsKit'),
    tags: z.array(z.string()).default([]),
  }),
})

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid],
    rehypeCodeOptions: {
      // Shiki dual themes; CSS in global.css swaps via `.dark` scope.
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
      inline: 'tailing-curly-colon',
    },
  },
})
