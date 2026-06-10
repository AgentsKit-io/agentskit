import type { Command } from 'commander'
import { addAgent } from '../registry'

export function registerAddCommand(program: Command): void {
  program
    .command('add <agent>')
    .description(
      'Add a ready-made agent from the AgentsKit registry (registry.agentskit.io). Copies the agent source into your project — you own the code. e.g. `agentskit add research`.',
    )
    .option('--out <dir>', 'Directory to write the agent into (default: ./agents)')
    .option('-f, --force', 'Overwrite existing files')
    .action(async (agent: string, options: { out?: string; force?: boolean }) => {
      try {
        const result = await addAgent(agent, { outDir: options.out, force: options.force === true })
        process.stdout.write(`\nAdded "${result.agent.title}" → ${result.targetDir}/\n`)
        for (const f of result.written) process.stdout.write(`  wrote  ${f}\n`)

        if (result.agent.packages.length > 0) {
          process.stdout.write(`\nInstall the packages it uses:\n`)
          process.stdout.write(`  npm install ${result.agent.packages.join(' ')} @agentskit/adapters\n`)
        }
        const required = (result.agent.env ?? []).filter((e) => e.required)
        if (required.length > 0) {
          process.stdout.write(`\nRequired environment:\n`)
          for (const e of required) process.stdout.write(`  ${e.name} — ${e.description}\n`)
        }
        const readme = result.written.find((f) => f.toLowerCase().endsWith('readme.md'))
        process.stdout.write(
          readme
            ? `\nSee ${readme} for usage.\n`
            : `\nUsage: https://registry.agentskit.io/agents/${result.agent.id}\n`,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        process.stderr.write(`\nadd failed: ${message}\n`)
        process.stderr.write(`(browse agents at https://registry.agentskit.io)\n`)
        process.exit(1)
      }
    })
}
