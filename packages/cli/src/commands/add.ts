import type { Command } from 'commander'
import { addAgent, resolveSystemPrompt } from '../registry'
import { runAgent } from '../run'

export function registerAddCommand(program: Command): void {
  program
    .command('add <agent>')
    .description(
      'Add a ready-made agent from the AgentsKit registry (registry.agentskit.io). Copies the agent source into your project — you own the code. With --run, also executes it. e.g. `agentskit add research` or `agentskit add legal-contract-reviewer --run "review this NDA…" --provider ollama`.',
    )
    .option('--out <dir>', 'Directory to write the agent into (default: ./agents)')
    .option('-f, --force', 'Overwrite existing files')
    .option('--run <task>', 'Run the agent on this task right after adding it')
    .option('--provider <provider>', 'Provider for --run (openai, anthropic, gemini, ollama, demo)', 'demo')
    .option('--model <model>', 'Model for --run')
    .option('--api-key <key>', 'API key for --run (else read from the provider env var)')
    .action(
      async (
        agent: string,
        options: {
          out?: string
          force?: boolean
          run?: string
          provider: string
          model?: string
          apiKey?: string
        },
      ) => {
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
          process.stdout.write(readme ? `\nSee ${readme} for usage.\n` : '\n')

          if (options.run) {
            const systemPrompt = resolveSystemPrompt(result.agent)
            if (!systemPrompt) {
              process.stderr.write(
                `\n--run is not supported for "${agent}" (it composes tools/keys). Use it as a library — see the README.\n`,
              )
              process.exit(1)
            }
            process.stdout.write(`\nRunning "${result.agent.title}" via ${options.provider}…\n\n`)
            await runAgent(options.run, {
              provider: options.provider,
              model: options.model,
              apiKey: options.apiKey,
              systemPrompt,
              maxSteps: '8',
            })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          process.stderr.write(`\nadd failed: ${message}\n`)
          process.stderr.write(`(browse agents at https://registry.agentskit.io)\n`)
          process.exit(1)
        }
      },
    )
}
