export const REPO = 'EmersonBraun/agentskit'
export const REPO_URL = `https://github.com/${REPO}`

export const ISSUES_URL = `${REPO_URL}/issues`
export const GOOD_FIRST_URL = `${ISSUES_URL}?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`
export const HELP_WANTED_URL = `${ISSUES_URL}?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22`
export const DISCUSSIONS_URL = `${REPO_URL}/discussions`

export function packageIssuesUrl(pkg: string) {
  return `${ISSUES_URL}?q=is%3Aissue+is%3Aopen+label%3A%22pkg%3A${pkg}%22`
}

type Contributor = {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

type Counts = {
  contributors: number
  openIssues: number
  goodFirst: number
  helpWanted: number
}

export async function fetchContributors(): Promise<Contributor[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=30`)
    if (!res.ok) return []
    return (await res.json()) as Contributor[]
  } catch {
    return []
  }
}

async function fetchSearchCount(q: string): Promise<number> {
  try {
    const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=1`)
    if (!res.ok) return 0
    const data: { total_count?: number } = await res.json()
    return data.total_count ?? 0
  } catch {
    return 0
  }
}

export async function fetchCounts(): Promise<Counts> {
  const [openIssues, goodFirst, helpWanted, contribRes] = await Promise.all([
    fetchSearchCount(`repo:${REPO} is:issue is:open`),
    fetchSearchCount(`repo:${REPO} is:issue is:open label:"good first issue"`),
    fetchSearchCount(`repo:${REPO} is:issue is:open label:"help wanted"`),
    fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=1&anon=1`),
  ])
  let contributors = 0
  if (contribRes.ok) {
    const link = contribRes.headers.get('link') ?? ''
    const m = link.match(/page=(\d+)>; rel="last"/)
    if (m) contributors = Number(m[1])
    else {
      const list = (await contribRes.json()) as unknown[]
      contributors = Array.isArray(list) ? list.length : 0
    }
  }
  return { openIssues, goodFirst, helpWanted, contributors }
}
