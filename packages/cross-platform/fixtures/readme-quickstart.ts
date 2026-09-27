import { runCommand, splitLines, toPosix } from '@agentskit/cross-platform'

// `npx` is `npx.cmd` on Windows: resolved without `shell: true`.
// The multi-line prompt goes through stdin, so cmd.exe cannot truncate it.
const result = await runCommand('npx', ['--yes', 'prettier', '--stdin-filepath', 'notes.md'], {
  input: '# Notes\n\n*  formatted on any OS and any runtime\n',
  timeoutMs: 60_000,
})

console.log(splitLines(result.stdout).length, 'lines')
console.log(toPosix('C:\\repo\\src\\index.ts'))
