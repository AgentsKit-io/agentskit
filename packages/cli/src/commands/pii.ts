import type { Command } from 'commander'
import { lintTaxonomyFile, renderLintReport } from '../pii'

export function registerPiiCommand(program: Command): void {
  const pii = program
    .command('pii')
    .description('Inspect and validate PII taxonomies.')

  pii
    .command('lint <file...>')
    .description('Validate one or more PII taxonomy JSON files.')
    .option('--json', 'Emit JSON instead of formatted output')
    .action((files: string[], options: { json?: boolean }) => {
      const reports = files.map(lintTaxonomyFile)
      const failed = reports.filter(r => !r.result.ok).length

      if (options.json) {
        process.stdout.write(JSON.stringify(reports, null, 2) + '\n')
      } else {
        for (const report of reports) {
          process.stdout.write(renderLintReport(report, { color: process.stdout.isTTY }))
        }
        if (failed > 0) {
          process.stderr.write(`\n${failed} of ${reports.length} taxonomy file${reports.length === 1 ? '' : 's'} failed validation\n`)
        }
      }

      if (failed > 0) process.exit(1)
    })
}
