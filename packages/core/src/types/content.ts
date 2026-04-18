/**
 * Provider-neutral multi-modal content parts. A single `Message.content`
 * is a string (classic path); multi-modal messages populate `parts`
 * alongside — adapters that understand parts read them, the rest fall
 * back to `content` (which we keep as a text projection via
 * `partsToText`).
 */

export interface TextPart {
  type: 'text'
  text: string
}

export interface ImagePart {
  type: 'image'
  /** Data URL, http(s) URL, or provider-hosted reference id. */
  source: string
  mimeType?: string
  /** Provider-neutral hint, e.g. 'low' / 'high'. */
  detail?: 'low' | 'high' | 'auto'
}

export interface AudioPart {
  type: 'audio'
  source: string
  mimeType?: string
  /** Duration in seconds, if known. */
  durationSec?: number
}

export interface VideoPart {
  type: 'video'
  source: string
  mimeType?: string
  durationSec?: number
}

export interface FilePart {
  type: 'file'
  source: string
  mimeType?: string
  /** Original filename, when available. */
  filename?: string
}

export type ContentPart = TextPart | ImagePart | AudioPart | VideoPart | FilePart

export type PartKind = ContentPart['type']

/** Build a text part. */
export function textPart(text: string): TextPart {
  return { type: 'text', text }
}

/** Build an image part from a URL / data URI / hosted id. */
export function imagePart(source: string, opts: Omit<ImagePart, 'type' | 'source'> = {}): ImagePart {
  return { type: 'image', source, ...opts }
}

export function audioPart(source: string, opts: Omit<AudioPart, 'type' | 'source'> = {}): AudioPart {
  return { type: 'audio', source, ...opts }
}

export function videoPart(source: string, opts: Omit<VideoPart, 'type' | 'source'> = {}): VideoPart {
  return { type: 'video', source, ...opts }
}

export function filePart(source: string, opts: Omit<FilePart, 'type' | 'source'> = {}): FilePart {
  return { type: 'file', source, ...opts }
}

/**
 * Collapse a parts array into a text-only projection. Non-text parts
 * are rendered as `[image: url]` / `[audio: url]` etc. so plain-text
 * adapters see *something* meaningful.
 */
export function partsToText(parts: ContentPart[]): string {
  const out: string[] = []
  for (const p of parts) {
    switch (p.type) {
      case 'text':
        out.push(p.text)
        break
      case 'image':
        out.push(`[image: ${p.source}]`)
        break
      case 'audio':
        out.push(`[audio: ${p.source}]`)
        break
      case 'video':
        out.push(`[video: ${p.source}]`)
        break
      case 'file':
        out.push(`[file: ${p.filename ?? p.source}]`)
        break
    }
  }
  return out.join('\n')
}

/**
 * Normalize any of (string | ContentPart[] | undefined) into
 * `{ text, parts }`. Callers that have both the legacy `content`
 * string and the new `parts` array use this to pick the right one.
 */
export function normalizeContent(
  content: string | undefined,
  parts: ContentPart[] | undefined,
): { text: string; parts: ContentPart[] } {
  if (parts && parts.length > 0) {
    return { text: partsToText(parts), parts }
  }
  const text = content ?? ''
  return { text, parts: text ? [textPart(text)] : [] }
}

/** Filter parts by kind. */
export function filterParts<T extends PartKind>(
  parts: ContentPart[],
  kind: T,
): Extract<ContentPart, { type: T }>[] {
  return parts.filter(p => p.type === kind) as Extract<ContentPart, { type: T }>[]
}
