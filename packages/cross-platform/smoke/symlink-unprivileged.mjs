// Windows-only check, run by CI as a freshly created non-admin user.
// Without Developer Mode or admin rights Windows refuses symlinks (EPERM);
// createSymlink must fall back to a junction (directories) or a copy (files),
// and removing the junction must never delete the target's contents.
// Usage: node smoke/symlink-unprivileged.mjs <writable-dir>
import { symlink, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createSymlink, removePath } from '../dist/index.js'

const root = process.argv[2]
if (!root) {
  console.error('usage: symlink-unprivileged.mjs <writable-dir>')
  process.exit(1)
}

const targetFile = join(root, 'alvo.txt')
const targetDir = join(root, 'pasta alvo')
await writeFile(targetFile, 'conteúdo')
await mkdir(targetDir, { recursive: true })
await writeFile(join(targetDir, 'dentro.txt'), 'dentro')

// Prove the precondition: this user really cannot create a symlink.
const probe = await symlink(targetFile, join(root, 'probe-link'), 'file').then(
  () => 'created',
  error => error.code,
)
if (probe !== 'EPERM') {
  console.error(`expected EPERM for a raw symlink as a non-admin user, got ${probe}; the check would prove nothing`)
  process.exit(2)
}

const fileKind = await createSymlink(targetFile, join(root, 'link arquivo.txt'))
const dirKind = await createSymlink(targetDir, join(root, 'link pasta'))
const problems = []
if (fileKind !== 'copy') problems.push(`file link kind ${fileKind}, expected copy`)
if (dirKind !== 'junction') problems.push(`dir link kind ${dirKind}, expected junction`)
if ((await readFile(join(root, 'link arquivo.txt'), 'utf8')) !== 'conteúdo') problems.push('copied file content differs')
if ((await readdir(join(root, 'link pasta'))).join() !== 'dentro.txt') problems.push('junction does not expose the target')

await removePath(join(root, 'link pasta'))
if ((await readdir(targetDir)).join() !== 'dentro.txt') problems.push('removing the junction deleted the target contents')

if (problems.length > 0) {
  console.error(`✗ ${problems.join('\n✗ ')}`)
  process.exit(1)
}
console.log(`✓ unprivileged symlink fallback: raw symlink → EPERM, file → ${fileKind}, dir → ${dirKind}, junction removal keeps target`)
