import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import type { Command } from 'commander'
import { loadConfig } from '../config'

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Show or scaffold the AgentsKit config.')
    .argument(
      '[action]',
      'Action: "init" to create a template, "show" to print the merged config.',
      'show',
    )
    .option('--global', 'Write/read the global config at ~/.agentskit/config.json (default)')
    .option('--local', 'Write/read a project-level .agentskit.config.json in the current directory')
    .option('--force', 'Overwrite an existing config file')
    .action(async (action: string, options) => {
      const isLocal = Boolean(options.local)
      const targetPath = isLocal
        ? path.join(process.cwd(), '.agentskit.config.json')
        : path.join(homedir(), '.agentskit', 'config.json')

      if (action === 'show') {
        const config = await loadConfig()
        process.stdout.write(JSON.stringify(config ?? {}, null, 2) + '\n')
        return
      }

      if (action !== 'init') {
        process.stderr.write(`Unknown action: ${action}. Use "init" or "show".\n`)
        process.exit(2)
      }

      if (existsSync(targetPath) && !options.force) {
        process.stderr.write(
          `Config already exists at ${targetPath}. Re-run with --force to overwrite.\n`,
        )
        process.exit(1)
      }

      const template = {
        defaults: {
          provider: 'openai',
          baseUrl: 'https://openrouter.ai/api',
          apiKeyEnv: 'OPENROUTER_API_KEY',
          model: 'openai/gpt-oss-120b:free',
          tools: 'web_search,fetch_url',
        },
      }

      mkdirSync(path.dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(template, null, 2) + '\n')
      process.stdout.write(
        `Wrote ${targetPath}\n` +
          `Edit it to taste, then run:\n  agentskit chat\n` +
          `(flags on the CLI still win over config values.)\n`,
      )
    })
}
