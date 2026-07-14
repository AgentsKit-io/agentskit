const DEFAULT_CORS_ORIGINS = [
  'https://www.agentskit.io',
  'https://agentskit.io',
  'https://registry.agentskit.io',
  'https://playbook.agentskit.io',
  'https://akos.agentskit.io',
  'http://localhost:3000',
] as const

const REQUIRED_CORS_ORIGINS = ['https://agentskit-io.github.io'] as const

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '')
}

export function resolveCorsOrigins(configuredOrigins?: string): string[] {
  const configured = configuredOrigins === undefined ? DEFAULT_CORS_ORIGINS : configuredOrigins.split(',')

  return [...new Set([...configured, ...REQUIRED_CORS_ORIGINS].map(normalizeOrigin).filter(Boolean))]
}
