import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { filesystem } from '../src/filesystem'
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ctx = { messages: [] as never[], call: { id: '1', name: '', args: {}, status: 'running' as const } }

describe('filesystem', () => {
  let basePath: string

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'agentskit-fs-'))
    await writeFile(join(basePath, 'hello.txt'), 'Hello World')
    await mkdir(join(basePath, 'subdir'))
    await writeFile(join(basePath, 'subdir', 'nested.txt'), 'Nested content')
  })

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true })
  })

  it('returns array of 3 tools', () => {
    const tools = filesystem({ basePath })
    expect(tools).toHaveLength(3)
    expect(tools.map(t => t.name)).toEqual(['read_file', 'write_file', 'list_directory'])
  })

  it('all tools satisfy ToolDefinition contract', () => {
    for (const tool of filesystem({ basePath })) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.schema).toBeDefined()
      expect(tool.tags!.length).toBeGreaterThan(0)
      expect(tool.category).toBe('filesystem')
      expect(tool.execute).toBeTypeOf('function')
    }
  })

  describe('read_file', () => {
    it('reads a file', async () => {
      const [readFile] = filesystem({ basePath })
      const result = await readFile.execute!({ path: 'hello.txt' }, ctx)
      expect(result).toBe('Hello World')
    })

    it('reads nested files', async () => {
      const [readFile] = filesystem({ basePath })
      const result = await readFile.execute!({ path: 'subdir/nested.txt' }, ctx)
      expect(result).toBe('Nested content')
    })

    it('throws on path traversal', async () => {
      const [readFile] = filesystem({ basePath })
      await expect(
        readFile.execute!({ path: '../../etc/passwd' }, ctx)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('write_file', () => {
    it('writes a new file', async () => {
      const [, writeFileTool] = filesystem({ basePath })
      const result = await writeFileTool.execute!({ path: 'new.txt', content: 'New content' }, ctx)
      expect(result).toContain('Written')

      // Verify via read
      const [readFile] = filesystem({ basePath })
      expect(await readFile.execute!({ path: 'new.txt' }, ctx)).toBe('New content')
    })

    it('creates directories as needed', async () => {
      const [, writeFileTool] = filesystem({ basePath })
      await writeFileTool.execute!({ path: 'deep/nested/file.txt', content: 'Deep' }, ctx)

      const [readFile] = filesystem({ basePath })
      expect(await readFile.execute!({ path: 'deep/nested/file.txt' }, ctx)).toBe('Deep')
    })

    it('throws on path traversal', async () => {
      const [, writeFileTool] = filesystem({ basePath })
      await expect(
        writeFileTool.execute!({ path: '../escape.txt', content: 'bad' }, ctx)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('list_directory', () => {
    it('lists root directory', async () => {
      const [,, listDir] = filesystem({ basePath })
      const result = await listDir.execute!({ path: '.' }, ctx) as string
      expect(result).toContain('hello.txt')
      expect(result).toContain('[dir] subdir')
    })

    it('lists subdirectory', async () => {
      const [,, listDir] = filesystem({ basePath })
      const result = await listDir.execute!({ path: 'subdir' }, ctx) as string
      expect(result).toContain('nested.txt')
    })

    it('throws on path traversal', async () => {
      const [,, listDir] = filesystem({ basePath })
      await expect(
        listDir.execute!({ path: '../..' }, ctx)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('hardened path-jail', () => {
    it('rejects absolute paths outside basePath', async () => {
      const [readFile] = filesystem({ basePath })
      await expect(
        readFile.execute!({ path: '/etc/passwd' }, ctx),
      ).rejects.toThrow('Access denied')
    })

    it('rejects deep ../ traversal that nominally lands inside basePath', async () => {
      const [readFile] = filesystem({ basePath })
      // path that descends then climbs out
      await expect(
        readFile.execute!({ path: 'subdir/../../escape.txt' }, ctx),
      ).rejects.toThrow('Access denied')
    })

    it('rejects symlink that escapes basePath', async () => {
      // Create a symlink inside basePath pointing outside.
      const outside = await mkdtemp(join(tmpdir(), 'agentskit-fs-outside-'))
      try {
        await writeFile(join(outside, 'secret.txt'), 'TOPSECRET')
        await symlink(join(outside, 'secret.txt'), join(basePath, 'escape'))
        const [readFile] = filesystem({ basePath })
        await expect(
          readFile.execute!({ path: 'escape' }, ctx),
        ).rejects.toThrow(/symbolic link|symlink escape|Access denied/)
      } finally {
        await rm(outside, { recursive: true, force: true })
      }
    })

    it('allows symlinks when denySymlinks:false and target is inside basePath', async () => {
      await writeFile(join(basePath, 'real.txt'), 'real')
      await symlink(join(basePath, 'real.txt'), join(basePath, 'link.txt'))
      const [readFile] = filesystem({ basePath, denySymlinks: false })
      const result = await readFile.execute!({ path: 'link.txt' }, ctx)
      expect(result).toBe('real')
    })

    it('rejects symlink to outside even with denySymlinks:false', async () => {
      const outside = await mkdtemp(join(tmpdir(), 'agentskit-fs-outside-'))
      try {
        await writeFile(join(outside, 'secret.txt'), 'TOPSECRET')
        await symlink(join(outside, 'secret.txt'), join(basePath, 'escape'))
        const [readFile] = filesystem({ basePath, denySymlinks: false })
        await expect(
          readFile.execute!({ path: 'escape' }, ctx),
        ).rejects.toThrow(/symlink escape|Access denied/)
      } finally {
        await rm(outside, { recursive: true, force: true })
      }
    })
  })
})
