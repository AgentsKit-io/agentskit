import type { Command } from 'commander'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { diffAgent } from '../registry'

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <agent>')
    .description('Show how your local copy of a registry agent differs from the current registry source.')
    .option('--out <dir>', 'Directory the agent was added into (default: ./agents)')
    .action(async (agent: string, options: { out?: string }) => {
      try {
        const { targetDir, files } = await diffAgent(agent, { outDir: options.out })
        let changed = 0
        for (const f of files) {
          if (f.status === 'unchanged') continue
          changed++
          process.stdout.write(`\n${f.status === 'missing-local' ? 'missing' : 'modified'}: ${join(targetDir, f.path)}\n`)
          if (f.diff) {
            for (const line of f.diff) {
              if (line.type === ' ') continue
              process.stdout.write(`  ${line.type} ${line.text}\n`)
            }
          }
        }
        process.stdout.write(
          changed === 0
            ? `\n${agent}: up to date with the registry.\n`
            : `\n${changed} file(s) differ. Run \`agentskit update ${agent}\` to apply the registry version.\n`,
        )
      } catch (err) {
        process.stderr.write(`\ndiff failed: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })
}

export function registerUpdateCommand(program: Command): void {
  program
    .command('update <agent>')
    .description('Update your local copy of a registry agent to the current registry source.')
    .option('--out <dir>', 'Directory the agent was added into (default: ./agents)')
    .option('-f, --force', 'Apply without listing the changes first')
    .action(async (agent: string, options: { out?: string; force?: boolean }) => {
      try {
        const { targetDir, files } = await diffAgent(agent, { outDir: options.out })
        const changed = files.filter((f) => f.status !== 'unchanged')
        if (changed.length === 0) {
          process.stdout.write(`\n${agent}: already up to date.\n`)
          return
        }
        if (!options.force) {
          process.stdout.write(`\nWill overwrite ${changed.length} file(s) with the registry version:\n`)
          for (const f of changed) process.stdout.write(`  ${f.path} (${f.status})\n`)
        }
        for (const f of changed) {
          const dest = join(targetDir, f.path)
          await mkdir(dirname(dest), { recursive: true })
          await writeFile(dest, f.upstream, 'utf8')
          process.stdout.write(`  updated ${dest}\n`)
        }
        process.stdout.write(`\nUpdated ${agent}. Review the changes with your VCS before committing.\n`)
      } catch (err) {
        process.stderr.write(`\nupdate failed: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })
}
