export const SITE_URL = 'https://www.agentskit.io'

export function canonicalUrl(pathname: string): string {
  return pathname === '/' ? SITE_URL : new URL(pathname, SITE_URL).toString()
}
