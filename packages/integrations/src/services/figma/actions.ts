import { defineAction } from '../../contract'

export const figmaGetFile = defineAction({
  name: 'figma_get_file',
  description: 'Read a Figma file (top-level node tree).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      fileKey: { type: 'string', description: 'The fileKey from the Figma URL (figma.com/file/<key>/...).' },
      depth: { type: 'number', description: 'Limit traversal depth.' },
    },
    required: ['fileKey'],
  },
  async execute(args, { http }) {
    const result = await http<{
      name: string; lastModified: string;
      document: { children?: Array<{ id: string; name: string; type: string }> };
    }>({
      method: 'GET',
      path: `/files/${args.fileKey}`,
      query: typeof args.depth === 'number' ? { depth: args.depth } : undefined,
    })
    return {
      name: result.name,
      lastModified: result.lastModified,
      topNodes: (result.document.children ?? []).map((n) => ({ id: n.id, name: n.name, type: n.type })),
    }
  },
})

export const figmaExportImages = defineAction({
  name: 'figma_export_images',
  description: 'Export Figma node ids as image URLs.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      fileKey: { type: 'string' },
      ids: { type: 'array', items: { type: 'string' }, description: 'Node ids to export.' },
      format: { type: 'string', enum: ['jpg', 'png', 'svg', 'pdf'] },
      scale: { type: 'number' },
    },
    required: ['fileKey', 'ids'],
  },
  async execute(args, { http }) {
    const idList = (args.ids as string[]).join(',')
    const result = await http<{ images: Record<string, string> }>({
      method: 'GET',
      path: `/images/${args.fileKey}`,
      query: { ids: idList, format: args.format ? String(args.format) : 'png', scale: typeof args.scale === 'number' ? args.scale : 2 },
    })
    return result.images
  },
})

export const figmaActions = [figmaGetFile, figmaExportImages]
