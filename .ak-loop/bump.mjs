import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const mode = process.argv[2]
const files = execFileSync('git', ['ls-files', '*package.json'], { encoding: 'utf8' }).split('\n').filter(Boolean)
const re = mode === 'ts' ? /("typescript": ")\^6[^"]*"/g : /("(?:vitest|@vitest\/[a-z0-9-]+)": ")\^4[^"]*"/g
const to = mode === 'ts' ? '^7.0.2' : '^5.0.5'
for (const f of files) {
  const s = readFileSync(f, 'utf8')
  const n = s.replace(re, `$1${to}"`)
  if (n !== s) { writeFileSync(f, n); console.log('bumped', f) }
}
