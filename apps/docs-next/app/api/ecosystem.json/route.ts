import ecosystem from '@/lib/ecosystem.json'

export const dynamic = 'force-static'

export function GET() {
  const publicProducts = ecosystem.products
    .filter((product) => product.navigation.showInBar)
    .sort((left, right) => left.navigation.order - right.navigation.order)
  const publicIds = new Set(publicProducts.map((product) => product.id))
  const products = publicProducts.map((product) => ({
    ...product,
    navigation: {
      ...product.navigation,
      next: product.navigation.next.filter((id) => publicIds.has(id)),
    },
  }))

  return Response.json({
    schemaVersion: ecosystem.schemaVersion,
    parentBrand: ecosystem.parentBrand,
    products,
  }, {
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
