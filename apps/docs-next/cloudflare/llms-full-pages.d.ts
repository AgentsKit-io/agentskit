// Resolved by the vite alias in vite.config.ts to lib/llms-full-pages.generated.json (build:vinext).
declare module 'virtual:llms-full-pages' {
  const pages: Record<string, { body: string; title?: string; description?: string }>
  export default pages
}
