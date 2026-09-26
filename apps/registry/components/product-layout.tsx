import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

/** Fumadocs header config; the wordmark is styled by the shared shell (`.ak-product-wordmark`). */
export function productLayout({ product, links }: {
  product: string
  links: BaseLayoutProps['links']
}): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="ak-product-wordmark">
          <span className="ak-product-wordmark__brand">AgentsKit</span>{' '}
          <span className="ak-product-wordmark__product">{product}</span>
        </span>
      ),
      url: '/',
    },
    links,
  }
}
