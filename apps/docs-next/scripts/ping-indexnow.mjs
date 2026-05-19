#!/usr/bin/env node
// Pushes every sitemap URL to IndexNow (Bing, Yandex, DuckDuckGo, Ecosia, ...).
// Runs after the Vercel deploy lands so the live sitemap reflects the new build.
//
// Env:
//   SITE          override site origin (default https://www.agentskit.io)
//   INDEXNOW_KEY  required — must match public/<key>.txt served at the origin

const SITE = (process.env.SITE ?? 'https://www.agentskit.io').replace(/\/$/, '')
const KEY = process.env.INDEXNOW_KEY
const HOST = new URL(SITE).host

if (!KEY) {
  console.error('INDEXNOW_KEY not set — skipping IndexNow ping.')
  process.exit(0)
}

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': 'agentskit-indexnow' } })
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

async function main() {
  const urlList = await sitemapUrls()
  if (urlList.length === 0) throw new Error('sitemap had no <loc> entries')

  // IndexNow accepts up to 10k URLs per request.
  for (let i = 0; i < urlList.length; i += 10000) {
    const batch = urlList.slice(i, i + 10000)
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
    })
    // 200 = accepted, 202 = received/validating. Both fine.
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`IndexNow ${res.status}: ${await res.text()}`)
    }
    console.log(`IndexNow: ${batch.length} URLs submitted (HTTP ${res.status}).`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
