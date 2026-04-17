import { source } from '@/lib/source'
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '@/mdx-components'
import { JsonLd } from '@/components/seo/json-ld'

const REPO = 'AgentsKit-io/agentskit'
const SITE = 'https://www.agentskit.io'

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

  const crumbs = (params.slug ?? []).map((seg, i, arr) => ({
    '@type': 'ListItem' as const,
    position: i + 2,
    name: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    item: `${SITE}/docs/${arr.slice(0, i + 1).join('/')}`,
  }))
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Docs', item: `${SITE}/docs` },
      ...crumbs,
    ],
  }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.data.title,
    description: page.data.description,
    url: slugPath === 'index' ? `${SITE}/docs` : `${SITE}/docs/${slugPath}`,
    author: { '@type': 'Organization', name: 'AgentsKit.js', url: SITE },
    publisher: { '@type': 'Organization', name: 'AgentsKit.js', url: SITE },
  }

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      editOnGithub={{
        owner: 'AgentsKit-io',
        repo: 'agentskit',
        sha: 'main',
        path: mdxPath,
      }}
    >
      <JsonLd data={breadcrumb} />
      <JsonLd data={article} />
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

  const slugPath = params.slug?.join('/') ?? ''
  const canonical = slugPath ? `${SITE}/docs/${slugPath}` : `${SITE}/docs`
  const section = params.slug?.[0] ?? ''
  const ogUrl = `${SITE}/api/og?title=${encodeURIComponent(page.data.title)}&description=${encodeURIComponent(page.data.description ?? '')}${section ? `&section=${encodeURIComponent(section)}` : ''}`
  const ogImage = {
    url: ogUrl,
    width: 1200,
    height: 630,
    alt: page.data.title,
  }

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: canonical,
      type: 'article',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: [ogUrl],
    },
  }
}
