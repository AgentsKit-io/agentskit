import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface FigmaConfig extends HttpToolOptions {
  /** Personal access token. */
  accessToken: string
}

function opts(config: FigmaConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.figma.com/v1',
    headers: { 'x-figma-token': config.accessToken },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function figmaGetFile(config: FigmaConfig) {
  return defineTool({
    name: 'figma_get_file',
    description: 'Read a Figma file (top-level node tree).',
    schema: {
      type: 'object',
      properties: {
        fileKey: { type: 'string', description: 'The fileKey from the Figma URL (figma.com/file/<key>/...).' },
        depth: { type: 'number', description: 'Limit traversal depth.' },
      },
      required: ['fileKey'],
    } as const,
    async execute({ fileKey, depth }) {
      const result = await httpJson<{
        name: string; lastModified: string;
        document: { children?: Array<{ id: string; name: string; type: string }> };
      }>(opts(config), {
        method: 'GET',
        path: `/files/${fileKey}`,
        query: typeof depth === 'number' ? { depth } : undefined,
      })
      return {
        name: result.name,
        lastModified: result.lastModified,
        topNodes: (result.document.children ?? []).map(n => ({ id: n.id, name: n.name, type: n.type })),
      }
    },
  })
}

export function figmaExportImages(config: FigmaConfig) {
  return defineTool({
    name: 'figma_export_images',
    description: 'Export Figma node ids as image URLs.',
    schema: {
      type: 'object',
      properties: {
        fileKey: { type: 'string' },
        ids: { type: 'array', items: { type: 'string' }, description: 'Node ids to export.' },
        format: { type: 'string', enum: ['jpg', 'png', 'svg', 'pdf'] },
        scale: { type: 'number' },
      },
      required: ['fileKey', 'ids'],
    } as const,
    async execute({ fileKey, ids, format, scale }) {
      const idList = (ids as string[]).join(',')
      const result = await httpJson<{ images: Record<string, string> }>(opts(config), {
        method: 'GET',
        path: `/images/${fileKey}`,
        query: {
          ids: idList,
          format: format ? String(format) : 'png',
          scale: typeof scale === 'number' ? scale : 2,
        },
      })
      return result.images
    },
  })
}

export function figma(config: FigmaConfig): ToolDefinition[] {
  return [
    figmaGetFile(config) as unknown as ToolDefinition,
    figmaExportImages(config) as unknown as ToolDefinition,
  ]
}
