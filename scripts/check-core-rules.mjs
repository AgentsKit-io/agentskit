import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runCli } from '../packages/cross-platform/dist/index.js'
import { CORE_RULES } from '../packages/core/dist/rules.js'

const args = process.argv.slice(2)
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
const baseline = value('--baseline') ?? '.core-rules-baseline.json'
if (args.includes('--allow-increase') || (args.includes('--init') && existsSync(resolve(baseline)))) {
  console.error(args.includes('--allow-increase') ? 'CORE baseline increases are not allowed.' : `Refusing to replace existing baseline: ${baseline}`)
  process.exitCode = 1
} else {
  const argv = ['check', ...(args.includes('--baseline') ? [] : ['--baseline', baseline]),
    ...(args.includes('--include') ? [] : ['--include', 'packages']), ...args]
  process.exitCode = await runCli(argv, {
    cwd: process.cwd(),
    log: line => console.log(line),
    error: line => console.error(line),
  }, {
    rules: CORE_RULES,
    filter: finding => /^packages\/[^/]+\/src\//.test(finding.file),
  })
}
