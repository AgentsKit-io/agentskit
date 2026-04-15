import { source } from '@/lib/source'
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '@/mdx-components'

const REPO = 'EmersonBraun/agentskit'

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const slugPath = params.slug?.join('/') ?? 'index'
  const mdxPath = `apps/docs-next/content/docs/${slugPath}.mdx`
  const editUrl = `https://github.com/${REPO}/edit/main/${mdxPath}`
  const issueUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`docs: ${slugPath}`)}`

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      editOnGithub={{
        owner: 'EmersonBraun',
        repo: 'agentskit',
        sha: 'main',
        path: mdxPath,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
        <div
          style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--color-fd-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 13,
            color: 'var(--color-fd-muted-foreground)',
          }}
        >
          <a href={editUrl} target="_blank" rel="noopener noreferrer">
            ✎ Edit this page on GitHub
          </a>
          <span style={{ opacity: 0.5 }}>·</span>
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            Found a problem? Open an issue →
          </a>
          <span style={{ opacity: 0.5 }}>·</span>
          <a href="/docs/contribute">How to contribute →</a>
        </div>
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
