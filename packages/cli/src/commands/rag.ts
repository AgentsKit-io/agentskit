import type { Command } from 'commander'
import { loadConfig } from '../config'
import { buildRagFromConfig, indexSources, type RagConfig } from '../extensibility/rag'

export function registerRagCommand(program: Command): void {
  const rag = program.command('rag').description('Retrieval-augmented generation utilities.')

  rag
    .command('index')
    .description('Index files referenced by config.rag.sources into the vector store.')
    .option('--source <glob>', 'Glob to index (overrides config.rag.sources; repeatable)',
      (value: string, prev: string[] = []) => [...prev, value],
      [])
    .action(async (options) => {
      const config = await loadConfig()
      const rawConfig = (config as unknown as { rag?: RagConfig })?.rag
      const overrideSources = options.source as string[]
      const ragConfig: RagConfig = {
        ...(rawConfig ?? {}),
        sources: overrideSources.length > 0 ? overrideSources : rawConfig?.sources ?? [],
      }
      if (!ragConfig.sources || ragConfig.sources.length === 0) {
        process.stderr.write('No RAG sources configured. Set config.rag.sources or pass --source <glob>.\n')
        process.exit(1)
      }
      try {
        const instance = buildRagFromConfig({ config: ragConfig })
        const result = await indexSources(instance, ragConfig)
        process.stdout.write(
          `Indexed ${result.documentCount} document${result.documentCount === 1 ? '' : 's'}.\n`,
        )
        for (const source of result.sources) {
          process.stdout.write(`  • ${source}\n`)
        }
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })
}
