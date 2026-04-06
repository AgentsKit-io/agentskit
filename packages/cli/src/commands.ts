import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import path from 'node:path'
import { loadConfig } from '@agentskit/core'
import type { AgentsKitConfig } from '@agentskit/core'
import { ChatApp, renderChatHeader } from './chat'
import { writeStarterProject } from './init'
import { runAgent } from './run'
import { RunApp } from './run-ui'

function mergeWithConfig(options: Record<string, unknown>, config: AgentsKitConfig | undefined): Record<string, unknown> {
  if (!config) return options
  return {
    ...options,
    // Config defaults — only apply if CLI flag wasn't set
    provider: options.provider !== 'demo' ? options.provider : (config.defaults?.provider ?? options.provider),
    model: options.model ?? config.defaults?.model,
  }
}

export function createCli() {
  const program = new Command()

  program
    .name('agentskit')
    .description('AgentsKit CLI for chat demos and project bootstrapping.')

  program
    .command('chat')
    .description('Start a terminal chat session.')
    .option('--provider <provider>', 'Provider to use', 'demo')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Override provider base URL')
    .option('--system <prompt>', 'System prompt')
    .option('--memory <path>', 'Path for file-based memory', '.agentskit-history.json')
    .option('--tools <tools>', 'Comma-separated tools: web_search,filesystem,shell')
    .option('--skill <skills>', 'Comma-separated skills: researcher,coder,planner,critic,summarizer')
    .option('--memory-backend <backend>', 'Memory backend: file (default), sqlite')
    .option('--no-config', 'Skip loading .agentskit.config.json')
    .action(async (options) => {
      const config = options.config !== false ? await loadConfig() : undefined
      const merged = mergeWithConfig(options, config)

      const chatOptions = {
        apiKey: (merged.apiKey ?? options.apiKey) as string | undefined,
        baseUrl: (merged.baseUrl ?? options.baseUrl) as string | undefined,
        provider: merged.provider as string,
        model: merged.model as string | undefined,
        system: options.system as string | undefined,
        memoryPath: options.memory as string | undefined,
        tools: options.tools as string | undefined,
        skill: options.skill as string | undefined,
        memoryBackend: options.memoryBackend as string | undefined,
        agentsKitConfig: config,
      }
      process.stdout.write(`${renderChatHeader(chatOptions)}\n`)
      render(React.createElement(ChatApp, chatOptions))
    })

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

  program
    .command('init')
    .description('Generate a starter project.')
    .option('--template <template>', 'Starter template (react|ink)', 'react')
    .option('--dir <directory>', 'Target directory', 'agentskit-starter')
    .action(async (options) => {
      await writeStarterProject({
        template: options.template === 'ink' ? 'ink' : 'react',
        targetDir: path.resolve(process.cwd(), options.dir),
      })
      process.stdout.write(`Created ${options.template} starter in ${options.dir}\n`)
    })

  return program
}
