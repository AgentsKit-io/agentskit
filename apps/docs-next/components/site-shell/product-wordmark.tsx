/** Fumadocs nav title markup styled by the shared shell stylesheet (`.ak-product-wordmark`). */
export function ProductWordmark({ product }: { product?: string }) {
  return (
    <span className="ak-product-wordmark">
      <span className="ak-product-wordmark__brand">AgentsKit</span>
      {product ? (
        <>
          {' '}
          <span className="ak-product-wordmark__product">{product}</span>
        </>
      ) : null}
    </span>
  )
}
