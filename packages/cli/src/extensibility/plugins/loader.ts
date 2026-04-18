import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin, PluginBundle, PluginContext, PluginFactory } from './types'

export interface LoadPluginsOptions {
  /** Plugin specifiers: absolute paths, relative paths, or package names. */
  specs?: string[]
  /** Extra directories to auto-discover plugin modules from. */
  pluginDirs?: string[]
  /** Working directory; defaults to process.cwd(). */
  cwd?: string
  /**
   * Auto-discover from `~/.agentskit/plugins`. Defaults to true. Tests pass
   * false so the user's real home dir can't contaminate runs.
   */
  autoDiscoverUserDir?: boolean
  /** Error logger. Defaults to stderr. */
  onError?: (spec: string, err: unknown) => void
  /** Info logger. */
  log?: (msg: string) => void
}

/**
 * Load every plugin listed in `specs` + any auto-discovered module in
 * `pluginDirs` (and `~/.agentskit/plugins` by default). Failures on a single
 * plugin are reported but do not abort the rest — a broken third-party
 * plugin should never prevent the CLI from starting.
 */
export async function loadPlugins(options: LoadPluginsOptions = {}): Promise<PluginBundle> {
  const {
    specs = [],
    pluginDirs = [],
    cwd = process.cwd(),
    autoDiscoverUserDir = true,
    onError = (spec, err) =>
      process.stderr.write(
        `[agentskit] plugin "${spec}" failed to load: ${err instanceof Error ? err.message : String(err)}\n`,
      ),
    log = () => {},
  } = options

  const resolvedSpecs = [...specs]

  const discoveryDirs = [...pluginDirs]
  if (autoDiscoverUserDir) discoveryDirs.push(join(homedir(), '.agentskit', 'plugins'))
  for (const dir of discoveryDirs) {
    const discovered = await discoverPluginsInDir(dir)
    resolvedSpecs.push(...discovered)
  }

  const plugins: Plugin[] = []
  for (const spec of resolvedSpecs) {
    try {
      const plugin = await loadPluginFromSpec(spec, cwd, log)
      if (plugin) plugins.push(plugin)
    } catch (err) {
      onError(spec, err)
    }
  }

  return mergePluginsIntoBundle(plugins)
}

async function discoverPluginsInDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    const absolutes = entries
      .filter(name => /\.(m?js|ts)$/i.test(name))
      .map(name => join(dir, name))
    // Validate each is a file; skip subdirs / broken symlinks silently.
    const validated: string[] = []
    for (const p of absolutes) {
      try {
        const s = await stat(p)
        if (s.isFile()) validated.push(p)
      } catch {
        /* ignore */
      }
    }
    return validated
  } catch {
    return []
  }
}

async function loadPluginFromSpec(
  spec: string,
  cwd: string,
  log: (msg: string) => void,
): Promise<Plugin | undefined> {
  const isPath = spec.startsWith('./') || spec.startsWith('../') || isAbsolute(spec)
  const importTarget = isPath
    ? pathToFileURL(resolve(cwd, spec)).href
    : spec

  const mod = await import(importTarget)
  const exported: unknown = mod.default ?? mod.plugin ?? mod
  const sourcePath = isPath ? resolve(cwd, spec) : undefined

  const ctx: PluginContext = {
    cwd,
    sourcePath,
    log: (msg: string) => log(`[${spec}] ${msg}`),
  }

  if (typeof exported === 'function') {
    const factory = exported as PluginFactory
    return await factory(ctx)
  }

  if (exported && typeof exported === 'object' && 'name' in (exported as object)) {
    const plugin = exported as Plugin
    if (plugin.init) await plugin.init(ctx)
    return plugin
  }

  throw new Error(
    'Module did not export a Plugin — expected default export to be a Plugin object or a PluginFactory function.',
  )
}

/**
 * Merge every plugin's records into a single bundle. Later plugins override
 * earlier ones by name (last-write-wins) — users override built-ins without
 * forking.
 */
export function mergePluginsIntoBundle(plugins: Plugin[]): PluginBundle {
  const bundle: PluginBundle = {
    plugins,
    slashCommands: [],
    tools: [],
    skills: [],
    providers: {},
    hooks: [],
    mcpServers: [],
  }

  for (const plugin of plugins) {
    if (plugin.slashCommands) bundle.slashCommands.push(...plugin.slashCommands)
    if (plugin.tools) bundle.tools.push(...plugin.tools)
    if (plugin.skills) bundle.skills.push(...plugin.skills)
    if (plugin.hooks) bundle.hooks.push(...plugin.hooks)
    if (plugin.mcpServers) bundle.mcpServers.push(...plugin.mcpServers)
    if (plugin.providers) {
      for (const [name, factory] of Object.entries(plugin.providers)) {
        bundle.providers[name] = factory
      }
    }
  }

  return bundle
}
