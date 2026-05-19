#!/usr/bin/env node
// Notifies Google's Indexing API of every sitemap URL (URL_UPDATED).
// No-ops unless GOOGLE_INDEXING_SA holds a service-account JSON key.
//
// Setup once:
//   1. GCP project → enable "Indexing API"
//   2. Create a service account, download its JSON key
//   3. In Search Console → Settings → Users → add the service account
//      email as an Owner
//   4. Repo secret GOOGLE_INDEXING_SA = full JSON key (single line)
//
// Default quota is 200 URLs/day. With >200 URLs the overflow 429s — that's
// fine, Google still recrawls the sitemap normally.

import crypto from 'node:crypto'

const SITE = (process.env.SITE ?? 'https://www.agentskit.io').replace(/\/$/, '')
const RAW = process.env.GOOGLE_INDEXING_SA

if (!RAW) {
  console.error('GOOGLE_INDEXING_SA not set — skipping Google Indexing API.')
  process.exit(0)
}

const sa = JSON.parse(RAW)

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signature = b64url(
    crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key),
  )
  const assertion = `${header}.${claim}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  return (await res.json()).access_token
}

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': 'agentskit-indexing' } })
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

async function main() {
  const token = await accessToken()
  const urls = await sitemapUrls()
  let ok = 0
  let quota = 0

  for (const url of urls) {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    })
    if (res.ok) ok++
    else if (res.status === 429) quota++
    else console.error(`  ${url} → ${res.status}`)
  }

  console.log(`Google Indexing: ${ok} accepted, ${quota} over daily quota, ${urls.length} total.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
