import React from 'react'
import { render } from 'ink'
import type { Command } from 'commander'
import { loadConfig } from '../config'
import { ChatApp, renderChatHeader } from '../app/ChatApp'
import { listSessions, resolveSession } from '../sessions'
import { mergeWithConfig } from './shared'
import { loadPlugins } from '../extensibility/plugins'
import { bridgeMcpServers, disposeMcpClients } from '../extensibility/mcp'
import { configHooksToHandlers } from '../extensibility/hooks'
import type { ConfigHooksMap } from '../extensibility/hooks'
import type { PermissionMode, PermissionPolicy } from '../extensibility/permissions'

export function registerChatCommand(program: Command): void {
  program
    .command('chat')
    .description('Start a terminal chat session.')
    .option('--provider <provider>', 'Provider to use', 'demo')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Override provider base URL')
    .option('--system <prompt>', 'System prompt')
    .option('--memory <path>', 'Explicit memory file path (overrides session management)')
    .option('--tools <tools>', 'Comma-separated tools: web_search,fetch_url,filesystem,shell')
    .option('--skill <skills>', 'Comma-separated skills: researcher,coder,planner,critic,summarizer')
    .option('--memory-backend <backend>', 'Memory backend: file (default), sqlite')
    .option('--new', 'Start a fresh chat session (ignore previous conversations in this directory)')
    .option('--resume [id]', 'Resume a prior session by id; omit id to resume the latest')
    .option('--list-sessions', 'List saved sessions for this directory and exit')
    .option('--no-config', 'Skip loading .agentskit.config.json')
    .option(
      '--plugin-dir <dir>',
      'Extra directory to auto-discover plugin modules from (repeatable)',
      (value: string, prev: string[] = []) => [...prev, value],
      [],
    )
    .option(
      '--mode <mode>',
      'Permission mode: default | plan | acceptEdits | bypassPermissions',
    )
    .action(async (options) => {
      if (options.listSessions) {
        const sessions = listSessions()
        if (sessions.length === 0) {
          process.stdout.write('No saved sessions for this directory.\n')
          return
        }
        for (const s of sessions) {
          const { id, updatedAt, messageCount, preview, model, label, forkedFrom } = s.metadata
          const display = label ? `${label} (${id})` : id
          const forkNote = forkedFrom ? `  ← fork ${forkedFrom}` : ''
          process.stdout.write(
            `${display}  ${updatedAt}  msgs=${messageCount}${model ? `  model=${model}` : ''}${forkNote}\n    ${preview}\n`,
          )
        }
        return
      }

      const config = options.config !== false ? await loadConfig() : undefined
      const merged = mergeWithConfig(options, config)

      const session = resolveSession({
        explicitPath: options.memory as string | undefined,
        forceNew: Boolean(options.new),
        resumeId: options.resume,
      })

      if (!session.isNew && !options.memory) {
        process.stdout.write(
          `Resuming session ${session.id}. Start fresh with --new or list with --list-sessions.\n`,
        )
      }

      const pluginBundle = await loadPlugins({
        specs: config?.plugins ?? [],
        pluginDirs: (options.pluginDir as string[]) ?? [],
      })

      const configHooks = configHooksToHandlers(config?.hooks as ConfigHooksMap | undefined)
      const hookHandlers = [...configHooks, ...pluginBundle.hooks]

      const configMcpSpecs = Object.entries(config?.mcp?.servers ?? {}).map(([name, spec]) => ({
        name,
        command: spec.command,
        args: spec.args,
        env: spec.env,
        timeout: spec.timeout,
      }))
      const allMcpSpecs = [...configMcpSpecs, ...pluginBundle.mcpServers]
      const { clients: mcpClients, tools: mcpTools } = await bridgeMcpServers(allMcpSpecs)

      const policyMode = (options.mode ?? config?.permissions?.mode ?? 'default') as PermissionMode
      const permissionPolicy: PermissionPolicy = {
        mode: policyMode,
        rules: (config?.permissions?.rules ?? []).map(r => ({
          tool: r.tool,
          action: r.action,
          scope: r.scope,
        })),
      }

      const chatOptions = {
        apiKey: (merged.apiKey ?? options.apiKey) as string | undefined,
        baseUrl: (merged.baseUrl ?? options.baseUrl) as string | undefined,
        provider: merged.provider as string,
        model: merged.model as string | undefined,
        system: (merged.system ?? options.system) as string | undefined,
        memoryPath: session.file,
        sessionId: session.id,
        tools: (merged.tools ?? options.tools) as string | undefined,
        skill: (merged.skill ?? options.skill) as string | undefined,
        memoryBackend: (merged.memoryBackend ?? options.memoryBackend) as string | undefined,
        agentsKitConfig: config,
        slashCommands: pluginBundle.slashCommands,
        extraTools: [...pluginBundle.tools, ...mcpTools],
        extraSkills: pluginBundle.skills,
        hookHandlers,
        permissionPolicy,
      }
      process.stdout.write(`${renderChatHeader(chatOptions)}\n`)
      const instance = render(React.createElement(ChatApp, chatOptions))
      try {
        await instance.waitUntilExit()
      } finally {
        disposeMcpClients(mcpClients)
      }

      if (options.memory) {
        process.stdout.write(
          `\nSession saved to ${session.file}. Resume with --memory ${session.file}\n`,
        )
      } else {
        process.stdout.write(
          `\nSession saved. Resume with:\n  agentskit chat --resume ${session.id}\nOr start fresh with:\n  agentskit chat --new\n`,
        )
      }
    })
}
