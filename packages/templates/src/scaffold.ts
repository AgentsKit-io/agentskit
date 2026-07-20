import {
  generatePackageJson,
  generateTsConfig,
  generateTsupConfig,
  generateToolSource,
  generateToolTest,
  generateSkillSource,
  generateSkillTest,
  generateAdapterSource,
  generateAdapterTest,
  generateChatMemorySource,
  generateChatMemoryTest,
  generateVectorMemorySource,
  generateVectorMemoryTest,
  generateFlowSource,
  generateFlowTest,
  generateFlowYaml,
  generateFlowReadme,
  generateEmbedderSource,
  generateEmbedderTest,
  generateBrowserAdapterSource,
  generateBrowserAdapterTest,
  generateReadme,
} from './blueprints'
import {
  type ScaffoldConfig,
  type ScaffoldType,
  validateScaffoldConfig,
} from './scaffold-config'
import {
  type PlannedFile,
  resolveScaffoldRoots,
  writePackageAtomically,
} from './scaffold-fs'

export type { ScaffoldType, ScaffoldConfig } from './scaffold-config'
export { SCAFFOLD_TYPES, validateScaffoldConfig } from './scaffold-config'

const sourceGenerators: Record<ScaffoldType, (name: string) => string> = {
  tool: generateToolSource,
  skill: generateSkillSource,
  adapter: generateAdapterSource,
  'memory-vector': generateVectorMemorySource,
  'memory-chat': generateChatMemorySource,
  flow: generateFlowSource,
  embedder: generateEmbedderSource,
  'browser-adapter': generateBrowserAdapterSource,
}

const testGenerators: Record<ScaffoldType, (name: string) => string> = {
  tool: generateToolTest,
  skill: generateSkillTest,
  adapter: generateAdapterTest,
  'memory-vector': generateVectorMemoryTest,
  'memory-chat': generateChatMemoryTest,
  flow: generateFlowTest,
  embedder: generateEmbedderTest,
  'browser-adapter': generateBrowserAdapterTest,
}

/** Build the deterministic file plan for a scaffold (no I/O). */
export function planScaffoldFiles(config: ScaffoldConfig): PlannedFile[] {
  validateScaffoldConfig(config)
  const files: PlannedFile[] = [
    { relativePath: 'package.json', content: generatePackageJson(config) },
    { relativePath: 'tsconfig.json', content: generateTsConfig() },
    { relativePath: 'tsup.config.ts', content: generateTsupConfig() },
    { relativePath: 'src/index.ts', content: sourceGenerators[config.type](config.name) },
    { relativePath: 'tests/index.test.ts', content: testGenerators[config.type](config.name) },
  ]

  if (config.type === 'flow') {
    files.push(
      { relativePath: 'flow.yaml', content: generateFlowYaml(config.name) },
      { relativePath: 'README.md', content: generateFlowReadme(config.name) },
    )
  } else {
    files.push({ relativePath: 'README.md', content: generateReadme(config) })
  }

  return files
}

/**
 * Scaffold a complete AgentsKit extension package on disk.
 *
 * Validates config first, writes into a sibling staging directory, then
 * renames atomically into `join(dir, name)`. Existing destinations fail
 * unless `overwrite: true`. Symlink destinations are always rejected.
 * Returned paths are the final destinations (never staging paths).
 */
export async function scaffold(config: ScaffoldConfig): Promise<string[]> {
  validateScaffoldConfig(config)

  const overwrite = config.overwrite === true
  const { parentDir, finalRoot } = resolveScaffoldRoots(config.dir, config.name)
  const files = planScaffoldFiles(config)

  return writePackageAtomically({
    parentDir,
    finalRoot,
    overwrite,
    files,
  })
}
