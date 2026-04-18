import path from 'node:path'
import type { Command } from 'commander'
import { writeStarterProject } from '../init'
import type { StarterKind, Provider, ToolKind, MemoryKind, PackageManager } from '../init'
import { runInteractiveInit, printNextSteps } from '../init-interactive'

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Generate a starter project. Run with no flags for interactive mode.')
    .option('--template <template>', 'Starter template (react|ink|runtime|multi-agent)')
    .option('--dir <directory>', 'Target directory', 'agentskit-app')
    .option('--provider <provider>', 'LLM provider (openai|anthropic|gemini|ollama|demo)')
    .option('--tools <tools>', 'Comma-separated tools (web_search,filesystem,shell)')
    .option('--memory <backend>', 'Memory backend (none|file|sqlite)')
    .option('--pm <packageManager>', 'Package manager (pnpm|npm|yarn|bun)')
    .option('-y, --yes', 'Skip interactive prompts; use flag values + defaults')
    .action(async (rawOptions) => {
      const isCi = !process.stdout.isTTY || rawOptions.yes || rawOptions.template
      let resolved: Parameters<typeof writeStarterProject>[0]

      if (isCi) {
        const template = (rawOptions.template ?? 'react') as StarterKind
        resolved = {
          targetDir: path.resolve(process.cwd(), rawOptions.dir),
          template,
          provider: (rawOptions.provider ?? 'demo') as Provider,
          tools: rawOptions.tools
            ? (rawOptions.tools.split(',').map((t: string) => t.trim()) as ToolKind[])
            : [],
          memory: (rawOptions.memory ?? 'none') as MemoryKind,
          packageManager: (rawOptions.pm ?? 'pnpm') as PackageManager,
        }
      } else {
        const result = await runInteractiveInit({
          dir: rawOptions.dir,
          template: rawOptions.template as StarterKind | undefined,
        })
        if (result.cancelled) {
          process.exit(0)
        }
        resolved = result.options
      }

      await writeStarterProject(resolved)

      if (isCi) {
        process.stdout.write(
          `Created ${resolved.template} starter in ${path.relative(process.cwd(), resolved.targetDir) || '.'}\n`,
        )
      } else {
        printNextSteps(resolved)
      }
    })
}
