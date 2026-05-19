export function JsonLd({ data }: { data: unknown }) {
  // Trusted, app-controlled structured data only. `<` escaped to < so the
  // JSON survives in the DOM without React HTML-escaping breaking the markup.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
