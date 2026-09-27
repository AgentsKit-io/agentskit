// Runtime smoke test for the built package. Runs unchanged under
// `node`, `bun` and `deno run -A` on Linux, macOS and Windows (CI matrix).
// Exercises the real OS behaviour the unit tests can only fake.
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import {
  commandExists,
  createSymlink,
  getRuntimeInfo,
  hashText,
  removePath,
  renamePath,
  runCommand,
  samePath,
  splitFrontmatter,
  splitLines,
  toPosix,
  writeFileAtomic,
} from '../dist/index.js'

const failures = []
async function check(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`  ✗ ${name}\n    ${error?.stack ?? error}`)
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// A killed orphan can linger as a zombie when PID 1 does not reap (containers); that is dead.
async function isAlive(pid) {
  try {
    process.kill(pid, 0)
  } catch {
    return false
  }
  const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => '')
  return !/^\d+ \(.*\) Z/.test(stat)
}

const info = getRuntimeInfo()
console.log(`@agentskit/cross-platform smoke — runtime=${info.runtime} os=${info.os}`)
const windows = info.os === 'windows'

await check('detects the expected runtime', () => {
  const expected = process.env.EXPECT_RUNTIME
  if (expected) assert(info.runtime === expected, `expected ${expected}, got ${info.runtime}`)
})

await check('long multi-line prompt reaches the child intact via stdin', async () => {
  const prompt = 'line 1\nline 2 "quoted" & ^caret %PATH% $HOME\n'.repeat(3000)
  const script = 'let d="";process.stdin.setEncoding("utf8").on("data",c=>d+=c).on("end",()=>process.stdout.write(String(d.length)))'
  const result = await runCommand('node', ['-e', script], { input: prompt })
  assert(result.code === 0, `exit ${result.code}: ${result.stderr}`)
  assert(result.stdout === String(prompt.length), `got ${result.stdout}, want ${prompt.length}`)
})

await check('arguments with spaces and quotes survive', async () => {
  const args = ['a b', 'c"d', "e'f", 'g&h']
  const result = await runCommand('node', ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', ...args])
  assert(result.stdout === JSON.stringify(args), `got ${result.stdout}`)
})

await check('npm-installed .cmd shims run without shell: true', async () => {
  assert(await commandExists('npm'), 'npm not on PATH')
  const result = await runCommand('npm', ['--version'])
  assert(result.code === 0 && /^\d+\.\d+/.test(result.stdout.trim()), `npm --version → ${result.code} ${result.stderr}`)
})

await check('timeout kills the whole process tree', async () => {
  const parent =
    'const c=require("child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});' +
    'console.log(c.pid);setInterval(()=>{},1000)'
  const result = await runCommand('node', ['-e', parent], { timeoutMs: 1500, killGraceMs: 500 })
  assert(result.timedOut, 'did not time out')
  const grandchild = Number(result.stdout.trim())
  assert(grandchild > 0, `no grandchild pid in ${JSON.stringify(result.stdout)}`)
  await new Promise(resolve => setTimeout(resolve, 1000))
  assert(!(await isAlive(grandchild)), `grandchild ${grandchild} survived`)
})

await check('missing commands fail with a typed error', async () => {
  const error = await runCommand('definitely-missing-cmd-xyz').catch(e => e)
  assert(error?.code === 'AK_PLATFORM_COMMAND_NOT_FOUND', `got ${error?.code ?? error}`)
})

await check('paths and line endings are OS-neutral', async () => {
  assert(toPosix('C:\\a\\b') === 'C:/a/b', 'toPosix')
  assert(samePath('C:\\Repo\\x', 'c:/repo/x/'), 'samePath')
  assert(splitLines('a\r\nb\n').join('|') === 'a|b', 'splitLines')
  assert(splitFrontmatter('---\r\nk: v\r\n---\r\nbody').frontmatter === 'k: v', 'frontmatter')
  assert((await hashText('x\r\n')) === (await hashText('x\n')), 'hashText')
})

await check('atomic write, rename, symlink and remove', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ak-xplat-smoke-'))
  try {
    const target = join(dir, 'state.json')
    await writeFileAtomic(target, '{"v":1}')
    await writeFileAtomic(target, '{"v":2}')
    assert((await readFile(target, 'utf8')) === '{"v":2}', 'atomic write content')
    await renamePath(target, join(dir, 'moved.json'))
    const kind = await createSymlink(join(dir, 'moved.json'), join(dir, 'link.json'))
    assert((await readFile(join(dir, 'link.json'), 'utf8')) === '{"v":2}', `link (${kind}) unreadable`)
    assert(!windows || ['symlink', 'copy'].includes(kind), `unexpected ${kind}`)
    assert((await readdir(dir)).sort().join() === 'link.json,moved.json', 'leftover temp files')
  } finally {
    await removePath(dir)
  }
})

// Paths like `C:\Program Files\…` and user folders with accents (`C:\Users\João`)
// are where cmd.exe quoting and code pages usually break.
await check('executables and cwd under paths with spaces and accents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ak xplat ação '))
  try {
    const binDir = join(root, 'Program Files', 'Ferramenta Ação')
    const workDir = join(root, 'projeto São Paulo', 'código')
    await mkdir(binDir, { recursive: true })
    await mkdir(workDir, { recursive: true })
    await writeFile(
      join(binDir, 'echo-args.js'),
      'process.stdout.write(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }))',
    )
    // A wrapper the way npm installs CLIs: a .cmd shim on Windows, a shebang script elsewhere.
    const shim = join(binDir, windows ? 'echo-args.cmd' : 'echo-args')
    if (windows) await writeFile(shim, '@echo off\r\nnode "%~dp0echo-args.js" %*\r\n')
    else {
      await writeFile(shim, '#!/bin/sh\nexec node "$(dirname "$0")/echo-args.js" "$@"\n')
      await chmod(shim, 0o755)
    }
    const args = ['com espaço', 'ação', 'naïve café', '日本語', 'a"b', 'x&y']
    const parse = result => {
      assert(result.code === 0, `exit ${result.code}: ${result.stderr}`)
      return JSON.parse(result.stdout)
    }

    const byPath = parse(await runCommand(shim, args, { cwd: workDir }))
    assert(JSON.stringify(byPath.args) === JSON.stringify(args), `args by path: ${JSON.stringify(byPath.args)}`)
    // macOS tmp lives behind a symlink (/var → /private/var): compare real paths.
    assert(samePath(await realpath(byPath.cwd), await realpath(workDir)), `cwd ${byPath.cwd} != ${workDir}`)

    const pathKey = Object.keys(process.env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH'
    const env = { ...process.env, [pathKey]: `${binDir}${delimiter}${process.env[pathKey] ?? ''}` }
    assert(await commandExists('echo-args', { path: env[pathKey] }), 'shim not found on PATH')
    const byName = parse(await runCommand('echo-args', args, { cwd: workDir, env }))
    assert(JSON.stringify(byName.args) === JSON.stringify(args), `args by name: ${JSON.stringify(byName.args)}`)

    const file = join(workDir, 'relatório final.json')
    await writeFileAtomic(file, '{"ok":"sim"}')
    await renamePath(file, join(workDir, 'relatório movido.json'))
    assert((await readFile(join(workDir, 'relatório movido.json'), 'utf8')) === '{"ok":"sim"}', 'accented file roundtrip')
  } finally {
    await removePath(root)
  }
})

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} smoke check(s) failed`)
  process.exit(1)
}
console.log('\n✓ all smoke checks passed')
