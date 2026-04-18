import React from 'react'
import { render } from 'ink'
import type { Command } from 'commander'
import { loadConfig } from '../config'
import { runAgent } from '../run'
import { RunApp } from '../run-ui'
import { mergeWithConfig } from './shared'

export function registerRunCommand(program: Command): void {
  program
    .command('run [task]')
    .description('Execute an agent task and output the result.')
    .option('--task <task>', 'Task string (alternative to positional argument)')
    .option('--provider <provider>', 'Provider to use', 'demo')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Override provider base URL')
    .option('--skill <skill>', 'Single skill to use')
    .option('--skills <skills>', 'Comma-separated skills (composed together)')
    .option('--tools <tools>', 'Comma-separated tools: web_search,filesystem,shell')
    .option('--memory <path>', 'Path for memory persistence')
    .option('--memory-backend <backend>', 'Memory backend: file (default), sqlite')
    .option('--system-prompt <prompt>', 'System prompt')
    .option('--max-steps <steps>', 'Maximum agent steps', '10')
    .option('--verbose', 'Stream agent steps to stderr')
    .option('--pretty', 'Use rich Ink-based output')
    .option('--no-config', 'Skip loading .agentskit.config.json')
    .action(async (positionalTask: string | undefined, options) => {
      const task = options.task ?? positionalTask
      if (!task) {
        process.stderr.write('Error: task is required. Pass as argument or use --task.\n')
        process.exit(1)
      }

      const config = options.config !== false ? await loadConfig() : undefined
      const merged = mergeWithConfig(options, config)

      if (options.pretty) {
        render(React.createElement(RunApp, { task, options }))
      } else {
        try {
          await runAgent(task, { ...options, provider: merged.provider, model: merged.model })
        } catch (err) {
          process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
          process.exit(1)
        }
      }
    })
}
