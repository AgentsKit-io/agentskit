import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const [mode] = process.argv.slice(2)
const files = execFileSync('git', ['ls-files', '--', '*package.json'], { encoding: 'utf8' }).split('\n').filter(Boolean)
for (const f of files) {
  let s = readFileSync(f, 'utf8')
  const o = s
  if (mode === 'ts') s = s.replace(/("typescript": )"\^6\.0\.3"/g, '$1"^7.0.2"')
  if (mode === 'vitest') s = s.replace(/("(?:vitest|@vitest\/[a-z0-9-]+)": )"\^4\.1\.12"/g, '$1"^5.0.5"')
  if (s !== o) { writeFileSync(f, s); console.log('bumped', f) }
}
