/**
 * `agentskit flow` — visual YAML editor for durable DAGs.
 *
 * Subcommands:
 *   • `validate <file>` — parse the YAML/JSON, type-check the DAG, report
 *     duplicate ids, missing handlers, unknown deps, and cycles.
 *   • `render <file>`   — emit a Mermaid `flowchart TD` to stdout. The
 *     visual editor's preview pane consumes the same output.
 *   • `run <file>`      — compile + execute. Handler registry is loaded
 *     from `--registry <module>`; the module's default export must be a
 *     `FlowRegistry`. With `--store <path>`, the durable step log is
 *     persisted as JSONL — pass the same `--run-id` to resume.
 */

import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import type { Command } from 'commander'
import {
  compileFlow,
  createFileStepLog,
  flowToMermaid,
  validateFlow,
  type FlowDefinition,
  type FlowRegistry,
  type FlowRunEvent,
  type StepLogStore,
} from '@agentskit/runtime'

async function loadDefinition(file: string): Promise<FlowDefinition> {
  const raw = await readFile(resolvePath(file), 'utf8')
  const parsed = file.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('flow file must be an object')
  const def = parsed as FlowDefinition
  if (!def.name || !Array.isArray(def.nodes)) {
    throw new Error('flow file must have `name` and `nodes[]`')
  }
  return def
}

async function loadRegistry(modulePath: string): Promise<FlowRegistry> {
  const url = pathToFileURL(resolvePath(modulePath)).href
  const mod = (await import(url)) as { default?: FlowRegistry; registry?: FlowRegistry }
  const registry = mod.default ?? mod.registry
  if (!registry || typeof registry !== 'object') {
    throw new Error(`registry module "${modulePath}" must default-export a FlowRegistry`)
  }
  return registry
}

export function registerFlowCommand(program: Command): void {
  const flow = program.command('flow').description('Compile and run visual YAML flows as durable DAGs.')

  flow
    .command('validate <file>')
    .description('Type-check a flow file: ids, handlers (when --registry given), deps, cycles.')
    .option('--registry <module>', 'JS/TS module exporting FlowRegistry as default')
    .action(async (file: string, options: { registry?: string }) => {
      try {
        const def = await loadDefinition(file)
        const registry = options.registry ? await loadRegistry(options.registry) : undefined
        const result = validateFlow(def, registry)
        if (result.ok) {
          process.stdout.write(`flow "${def.name}" ok — ${result.order.length} node(s), order: ${result.order.join(' → ')}\n`)
          return
        }
        for (const issue of result.issues) {
          process.stderr.write(`  ✗ [${issue.code}] ${issue.message}\n`)
        }
        process.exit(1)
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })

  flow
    .command('render <file>')
    .description('Emit a Mermaid flowchart for the flow.')
    .action(async (file: string) => {
      try {
        const def = await loadDefinition(file)
        process.stdout.write(flowToMermaid(def) + '\n')
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })

  flow
    .command('run <file>')
    .description('Compile and execute a flow with a handler registry.')
    .requiredOption('--registry <module>', 'JS/TS module exporting FlowRegistry as default')
    .option('--input <json>', 'JSON string passed to handlers as ctx.input')
    .option('--store <path>', 'Persist durable step log as JSONL at <path>')
    .option('--run-id <id>', 'Resume a previous run by reusing its id')
    .option('--max-attempts <n>', 'Retries per node (default 1)', '1')
    .option('--retry-delay <ms>', 'Delay between attempts in ms', '0')
    .option('--verbose', 'Stream node events to stderr')
    .action(async (file: string, options: {
      registry: string
      input?: string
      store?: string
      runId?: string
      maxAttempts: string
      retryDelay: string
      verbose?: boolean
    }) => {
      try {
        const def = await loadDefinition(file)
        const registry = await loadRegistry(options.registry)
        const compiled = compileFlow({ definition: def, registry })
        const input = options.input ? JSON.parse(options.input) : undefined
        const store: StepLogStore | undefined = options.store
          ? await createFileStepLog(resolvePath(options.store))
          : undefined
        const onEvent = options.verbose
          ? (e: FlowRunEvent) => process.stderr.write(JSON.stringify(e) + '\n')
          : undefined
        const outputs = await compiled.run(input, {
          runId: options.runId,
          store,
          maxAttempts: Number(options.maxAttempts),
          retryDelayMs: Number(options.retryDelay),
          onEvent,
        })
        process.stdout.write(JSON.stringify(outputs, null, 2) + '\n')
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    })
}
