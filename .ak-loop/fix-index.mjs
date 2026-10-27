import { readFileSync, writeFileSync } from 'node:fs'

const path = 'apps/docs-next/lib/ask-index/index.json'
const text = readFileSync(path, 'utf8')
const from = '`@vercel/speed-insights` added.'
const to = 'Vercel Speed Insights added.'
const count = text.split(from).length - 1
if (count !== 1) throw new Error(`expected 1 occurrence, found ${count}`)
writeFileSync(path, text.replace(from, to))
JSON.parse(readFileSync(path, 'utf8'))
console.log('ok')
