/**
 * Canonical AgentsKit ecosystem section for llms.txt machine indexes.
 * Keep in sync with `scripts/lib/ecosystem-llms-block.mjs` and
 * `@agentskit/doc-bridge` `formatEcosystemLlmsBlock`.
 */

export type EcosystemLlmsProduct = {
  readonly id: string
  readonly name: string
  readonly role?: string
  readonly promise: string
  readonly maturity?: string
  readonly surfaces: {
    readonly home?: string
    readonly docs?: string
    readonly llms?: string
  }
}

export type FormatEcosystemLlmsBlockOptions = {
  readonly products: readonly EcosystemLlmsProduct[]
  readonly currentProductId?: string
  readonly heading?: string
  readonly prefer?: 'home' | 'docs'
}

export function formatEcosystemLlmsBlock(options: FormatEcosystemLlmsBlockOptions): string[] {
  const heading = options.heading ?? 'AgentsKit ecosystem'
  const prefer = options.prefer ?? 'home'
  const lines: string[] = [`## ${heading}`, '']

  for (const product of options.products) {
    const primary =
      prefer === 'docs'
        ? product.surfaces.docs ?? product.surfaces.home
        : product.surfaces.home ?? product.surfaces.docs
    if (!primary) continue

    const current = product.id === options.currentProductId ? ' **(current)**' : ''
    const role = product.role ? ` Role: \`${product.role}\`.` : ''
    const maturity = product.maturity ? ` Maturity: ${product.maturity}.` : ''
    const machine = product.surfaces.llms ? ` Machine index: ${product.surfaces.llms}` : ''
    lines.push(
      `- [${product.name}](${primary})${current} — ${product.promise}.${role}${maturity}${machine}`,
    )
  }

  lines.push('')
  return lines
}
