import type { Command } from 'commander'
import { writeRules, type Editor } from '../rules'

const VALID: Editor[] = ['cursor', 'windsurf', 'codex', 'claude-code', 'all']

export function registerRulesCommand(program: Command): void {
  program
    .command('rules <editor>')
    .description(
      'Write editor rule files (cursor | windsurf | codex | claude-code | all). Teaches the editor AgentsKit conventions so generated code respects named-export-only, package boundaries, and the for-agents/* manifest.',
    )
    .option('--out <dir>', 'Workspace root to write files into (default: cwd)')
    .option('-f, --force', 'Overwrite existing rule files (codex / claude-code skill always update in place)')
    .action(async (editor: string, options: { out?: string; force?: boolean }) => {
      if (!(VALID as string[]).includes(editor)) {
        process.stderr.write(`unknown editor "${editor}". Valid: ${VALID.join(', ')}\n`)
        process.exit(1)
      }
      try {
        const results = await writeRules(editor as Editor, {
          rootDir: options.out,
          force: options.force === true,
        })
        const counts = { wrote: 0, updated: 0, skipped: 0 }
        for (const { editor: ed, files } of results) {
          process.stdout.write(`\n[${ed}]\n`)
          for (const f of files) {
            counts[f.action]++
            process.stdout.write(`  ${f.action.padEnd(7)} ${f.path}\n`)
          }
        }
        process.stdout.write(
          `\nDone — ${counts.wrote} wrote, ${counts.updated} updated, ${counts.skipped} skipped.\n`,
        )
        if (counts.skipped > 0 && options.force !== true) {
          process.stdout.write(`(re-run with --force to overwrite skipped files)\n`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        process.stderr.write(`\nrules failed: ${message}\n`)
        process.exit(1)
      }
    })
}
