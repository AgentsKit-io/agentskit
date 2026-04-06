import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import path from 'node:path'
import { ChatApp, renderChatHeader } from './chat'
import { writeStarterProject } from './init'

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
    .action((options) => {
      process.stdout.write(`${renderChatHeader(options)}\n`)
      render(React.createElement(ChatApp, {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        provider: options.provider,
        model: options.model,
        system: options.system,
        memoryPath: options.memory,
        tools: options.tools,
        skill: options.skill,
        memoryBackend: options.memoryBackend,
      }))
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
