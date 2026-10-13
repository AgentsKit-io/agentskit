export const PACKAGE_NAMES = [
  'adapters', 'angular', 'chat', 'chat-cli', 'chat-devtools', 'chat-protocol',
  'chat-server', 'cli', 'code-review', 'core', 'cross-platform', 'doc-bridge',
  'eval', 'eval-braintrust', 'harness', 'ink', 'integrations', 'mcp', 'memory',
  'net', 'observability', 'observability-langfuse', 'playbook', 'rag', 'react',
  'react-native', 'runtime', 'sandbox', 'skills', 'solid', 'statechart',
  'svelte', 'templates', 'tools', 'validation', 'vue',
] as const

export const FIRST_PUBLISHED_DAY = '2026-04-05'

export type PackageName = `@agentskit/${(typeof PACKAGE_NAMES)[number]}`
export type DailyCount = { day: string; downloads: number }
export type PackageCounts = { name: PackageName; downloads: DailyCount[]; pending: boolean }
export type DownloadsData = { since: string; through: string; packages: PackageCounts[] }

const DAY = 86_400_000

export function addDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY).toISOString().slice(0, 10)
}

export function dateChunks(start: string, end: string): { start: string; end: string }[] {
  const chunks = []
  for (let day = start; day <= end;) {
    const last = addDays(day, 364)
    const chunkEnd = last < end ? last : end
    chunks.push({ start: day, end: chunkEnd })
    day = addDays(chunkEnd, 1)
  }
  return chunks
}

export function sumDays(days: DailyCount[], start: string, end: string): number {
  return days.reduce((sum, entry) => sum + (entry.day >= start && entry.day <= end ? entry.downloads : 0), 0)
}
