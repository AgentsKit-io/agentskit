import type { EvalResult } from '@agentskit/core'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Protect CDATA content against premature terminator `]]>`. */
function escapeCdata(s: string): string {
  return s.replace(/]]>/g, ']]]]><![CDATA[>')
}

/**
 * Escape a value for GitHub Actions workflow commands.
 * Encodes %, CR, LF so they cannot break the command protocol.
 */
export function escapeGhaData(s: string): string {
  return s
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

/**
 * Escape a property value for GitHub Actions workflow commands.
 * Also encodes `:` and `,` which delimit property pairs.
 */
export function escapeGhaProperty(s: string): string {
  return escapeGhaData(s).replace(/:/g, '%3A').replace(/,/g, '%2C')
}

/**
 * Render an `EvalResult` as a JUnit-compatible XML report. Most CI
 * tools (GitHub Actions test-reporter, CircleCI, Jenkins) can parse
 * this directly into their test-result UI.
 */
export function renderJUnit(suiteName: string, result: EvalResult): string {
  const failures = result.failed
  const totalMs = result.results.reduce((acc, c) => acc + c.latencyMs, 0)
  const cases = result.results
    .map(c => {
      const inner = c.passed
        ? ''
        : `\n    <failure message="${escapeXml(c.error ?? 'expected assertion failed')}"><![CDATA[${escapeCdata(`input: ${c.input}\noutput: ${c.output}`)}]]></failure>`
      return `  <testcase classname="${escapeXml(suiteName)}" name="${escapeXml(String(c.input).slice(0, 120))}" time="${(c.latencyMs / 1000).toFixed(3)}">${inner}\n  </testcase>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="agentskit-evals" tests="${result.totalCases}" failures="${failures}" time="${(totalMs / 1000).toFixed(3)}">
  <testsuite name="${escapeXml(suiteName)}" tests="${result.totalCases}" failures="${failures}" time="${(totalMs / 1000).toFixed(3)}">
${cases}
  </testsuite>
</testsuites>
`
}

/**
 * Render a GitHub-flavored Markdown summary suitable for
 * $GITHUB_STEP_SUMMARY in a workflow run.
 */
export function renderMarkdown(suiteName: string, result: EvalResult): string {
  const pct = (result.accuracy * 100).toFixed(1)
  // Make a string safe for a single Markdown table cell wrapped in
  // backticks. Escape backslashes first (so a literal `\` can't pair
  // with the pipe escape added below), then drop backticks (would end
  // the code span), collapse newlines (would break the row), and
  // escape pipes.
  const cell = (s: string): string =>
    s
      .slice(0, 80)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\|/g, '\\|')
  const rows = result.results
    .map(c => {
      const status = c.passed ? ':white_check_mark:' : ':x:'
      const input = cell(String(c.input))
      const output = cell(c.output)
      return `| ${status} | \`${input}\` | \`${output}\` | ${c.latencyMs}ms |`
    })
    .join('\n')
  return `### Suite: ${suiteName}

**Accuracy:** ${pct}% (${result.passed}/${result.totalCases})

| | Input | Output | Latency |
|---|---|---|---|
${rows}
`
}

/**
 * Render GitHub Actions workflow annotations (::error::, ::notice::)
 * so failures surface inline on the PR diff view.
 */
export function renderGitHubAnnotations(suiteName: string, result: EvalResult): string {
  const lines: string[] = []
  for (const c of result.results) {
    if (c.passed) continue
    const title = escapeGhaProperty(`${suiteName}: ${String(c.input).slice(0, 60)}`)
    const msg = escapeGhaData(c.error ?? 'assertion failed')
    lines.push(`::error title=${title}::${msg}`)
  }
  const pct = (result.accuracy * 100).toFixed(1)
  const noticeTitle = escapeGhaProperty(suiteName)
  const noticeMsg = escapeGhaData(`${result.passed}/${result.totalCases} passed (${pct}%)`)
  lines.push(`::notice title=${noticeTitle}::${noticeMsg}`)
  return lines.join('\n') + '\n'
}
