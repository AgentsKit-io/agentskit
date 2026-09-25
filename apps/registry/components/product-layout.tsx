import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function productLayout({ name, links, githubUrl }: {
  name: string
  links: BaseLayoutProps['links']
  githubUrl: string
}): BaseLayoutProps {
  return {
    nav: { title: <span className="ak-wordmark font-display text-base font-bold tracking-tight">{name}</span>, url: '/' },
    links,
    githubUrl,
  }
}
