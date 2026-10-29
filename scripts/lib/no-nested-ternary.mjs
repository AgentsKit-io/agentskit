import { readFileSync } from 'node:fs'
// Root `typescript` is v7 (no JS compiler API); use the 5.9 alias.
import ts from 'typescript-5-9'

export function findNestedTernaries(fileName, sourceText) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  )
  const hits = []

  function visit(node, parentIsConditional = false) {
    const isConditional = ts.isConditionalExpression(node)
    if (isConditional && parentIsConditional) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      hits.push({ line: position.line + 1, column: position.character + 1 })
    }
    ts.forEachChild(node, (child) => visit(child, parentIsConditional || isConditional))
  }

  visit(sourceFile)
  return hits
}

export function findNestedTernariesInFile(fileName) {
  return findNestedTernaries(fileName, readFileSync(fileName, 'utf8'))
}
