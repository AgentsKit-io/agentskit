/**
 * Canonical AgentsKit ecosystem section for llms.txt machine indexes.
 * Keep in sync with @agentskit/doc-bridge `formatEcosystemLlmsBlock`.
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   role?: string,
 *   promise: string,
 *   maturity?: string,
 *   surfaces: { home?: string, docs?: string, llms?: string }
 * }} EcosystemLlmsProduct
 */

/**
 * @param {{
 *   products: EcosystemLlmsProduct[],
 *   currentProductId?: string,
 *   heading?: string,
 *   prefer?: 'home' | 'docs',
 * }} options
 * @returns {string[]}
 */
export function formatEcosystemLlmsBlock(options) {
  const heading = options.heading ?? 'AgentsKit ecosystem'
  const prefer = options.prefer ?? 'home'
  const lines = [`## ${heading}`, '']

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
