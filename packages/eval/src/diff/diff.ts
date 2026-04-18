export type DiffOp = 'equal' | 'add' | 'remove'

export interface DiffLine {
  op: DiffOp
  /** 1-based line number in the side that owns this line. */
  lineNo: number
  content: string
}

export interface PromptDiff {
  lines: DiffLine[]
  added: number
  removed: number
  changed: boolean
}

function splitLines(input: string): string[] {
  return input.split(/\r?\n/)
}

/**
 * Classic LCS line diff — O(n·m), fine for prompt sizes.
 */
export function promptDiff(oldPrompt: string, newPrompt: string): PromptDiff {
  const a = splitLines(oldPrompt)
  const b = splitLines(newPrompt)
  const n = a.length
  const m = b.length

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }

  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  let added = 0
  let removed = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ op: 'equal', lineNo: j + 1, content: a[i]! })
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      lines.push({ op: 'remove', lineNo: i + 1, content: a[i]! })
      removed++
      i++
    } else {
      lines.push({ op: 'add', lineNo: j + 1, content: b[j]! })
      added++
      j++
    }
  }
  while (i < n) {
    lines.push({ op: 'remove', lineNo: i + 1, content: a[i]! })
    removed++
    i++
  }
  while (j < m) {
    lines.push({ op: 'add', lineNo: j + 1, content: b[j]! })
    added++
    j++
  }

  return { lines, added, removed, changed: added > 0 || removed > 0 }
}

/**
 * Unified-diff style rendering for terminals / logs.
 */
export function formatDiff(diff: PromptDiff): string {
  return diff.lines
    .map(l => (l.op === 'equal' ? `  ${l.content}` : l.op === 'add' ? `+ ${l.content}` : `- ${l.content}`))
    .join('\n')
}

export interface AttributionInput {
  oldPrompt: string
  newPrompt: string
  oldOutput: string
  newOutput: string
}

export interface Attribution {
  outputChanged: boolean
  promptChanged: boolean
  /** Heuristic score [0,1] — fraction of changed prompt lines that share tokens with the new-vs-old output delta. */
  score: number
  suspectLines: DiffLine[]
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2),
  )
}

/**
 * "git blame for prompts". Given an old/new prompt and old/new output,
 * return the changed prompt lines that share tokens with the output
 * delta — the suspects most likely responsible for the behavior shift.
 */
export function attributePromptChange(input: AttributionInput): Attribution {
  const promptD = promptDiff(input.oldPrompt, input.newPrompt)
  const outputD = promptDiff(input.oldOutput, input.newOutput)
  const outputDeltaTokens = new Set<string>()
  for (const l of outputD.lines) {
    if (l.op === 'equal') continue
    for (const t of tokens(l.content)) outputDeltaTokens.add(t)
  }

  const changedPromptLines = promptD.lines.filter(l => l.op !== 'equal')
  const suspects: DiffLine[] = []
  for (const line of changedPromptLines) {
    for (const t of tokens(line.content)) {
      if (outputDeltaTokens.has(t)) {
        suspects.push(line)
        break
      }
    }
  }

  return {
    outputChanged: outputD.changed,
    promptChanged: promptD.changed,
    score: changedPromptLines.length === 0 ? 0 : suspects.length / changedPromptLines.length,
    suspectLines: suspects,
  }
}
