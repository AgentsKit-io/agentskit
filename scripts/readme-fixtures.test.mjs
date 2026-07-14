import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import ts from 'typescript'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'

const standard = JSON.parse(readFileSync(join(REPO_ROOT, 'readme-standard-v1.json'), 'utf8'))
const fixtures = [...new Set(standard.surfaces.flatMap(surface => surface.examples.map(example => example.fixture)))]

test.each(fixtures)('%s is a parseable, self-contained README fixture', fixture => {
  const path = join(REPO_ROOT, fixture)
  const extension = extname(path)

  if (extension === '.sh') {
    const result = spawnSync('bash', ['-n', path], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return
  }

  assert.ok(extension === '.ts' || extension === '.tsx', `Unsupported README fixture: ${fixture}`)
  const source = readFileSync(path, 'utf8')
  const transpiled = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
  })
  const syntaxErrors = (transpiled.diagnostics ?? []).filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
  assert.deepEqual(syntaxErrors.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [])

  // With imports intentionally unresolved, TS still catches accidental local
  // placeholders such as `myAgent` that would make a copied example unusable.
  const program = ts.createProgram([path], {
    noEmit: true,
    noResolve: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.Preserve,
  })
  const unresolvedLocals = program.getSemanticDiagnostics().filter(diagnostic => diagnostic.code === 2304)
  assert.deepEqual(unresolvedLocals.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [])
})
