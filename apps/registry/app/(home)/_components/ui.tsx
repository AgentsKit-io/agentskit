import type { CSSProperties } from 'react'

const P: Record<string, string> = {
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'arrow-right': '<line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'github': '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  'terminal': '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  'sparkles': '<path d="M9.94 14.06 8 21l-1.94-6.94L0 12l6.06-2.06L8 3l1.94 6.94L16 12l-6.06 2.06z" transform="translate(4 0) scale(0.7)"/><path d="M19 3v4M21 5h-4"/>',
  'bot': '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'package': '<path d="M16 16h6l-3-7-3 7Z" transform="scale(0)"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  'key': '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'layers': '<path d="m12.83 2.18 8.78 4.39a1 1 0 0 1 0 1.86l-8.78 4.39a2 2 0 0 1-1.66 0L2.39 8.43a1 1 0 0 1 0-1.86l8.78-4.39a2 2 0 0 1 1.66 0Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'scale': '<path d="M16 16h6l-3-7-3 7Z"/><path d="M2 16h6l-3-7-3 7Z"/><path d="M7 9h10"/><path d="M12 3v18"/><path d="M8 21h8"/>',
  'landmark': '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4 1.5-3 1 2h5.27"/>',
  'life-buoy': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" x2="9.17" y1="4.93" y2="9.17"/><line x1="14.83" x2="19.07" y1="14.83" y2="19.07"/><line x1="14.83" x2="19.07" y1="9.17" y2="4.93"/><line x1="4.93" x2="9.17" y1="19.07" y2="14.83"/>',
  'git-branch': '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'calendar': '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  'server': '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
  'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  'shopping-cart': '<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>',
  'layout': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>',
  'shield': '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
  'umbrella': '<path d="M22 12a10.1 10.1 0 0 0-20 0Z"/><path d="M12 12v7a3 3 0 0 0 6 0"/>',
  'home': '<path d="m3 11 9-9 9 9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
  'graduation-cap': '<path d="m2 10 10-5 10 5-10 5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  'clipboard-check': '<rect width="16" height="18" x="4" y="4" rx="2"/><path d="M9 4V2h6v2M9 12l2 2 4-4"/>',
  'boxes': '<path d="m7.5 4.3 4.5-2.6 4.5 2.6v5.2L12 12 7.5 9.5Z"/><path d="m2 14.5 4.5-2.6 4.5 2.6v5.2l-4.5 2.6L2 19.7ZM13 14.5l4.5-2.6 4.5 2.6v5.2l-4.5 2.6-4.5-2.6Z"/>',
  'box': '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
}

export function Icon({ name, size = 20, className = '', style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[name] ?? P.box }}
    />
  )
}

/** Presentational copy button — the global delegation in <LandingFx> handles the click. */
export function CopyButton({
  value,
  variant = 'ghost',
  className = '',
  analytics,
}: {
  value: string
  variant?: 'ghost' | 'icon'
  className?: string
  analytics?: { agentId: string; surface: 'catalog' | 'hero' | 'guide' }
}) {
  const base =
    'rg-copy inline-flex items-center justify-center gap-1.5 rounded-lg border border-ak-border bg-ak-surface text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam cursor-pointer'
  const pad = variant === 'icon' ? 'p-2' : 'px-3 py-1.5 text-xs font-semibold'
  return (
    <button
      type="button"
      data-copy={value}
      data-agent-id={analytics?.agentId}
      data-copy-surface={analytics?.surface}
      aria-label="Copy"
      className={`${base} ${pad} ${className}`}
    >
      <span className="cp inline-flex"><Icon name="copy" size={15} /></span>
      <span className="ck"><Icon name="check" size={15} /></span>
      {variant !== 'icon' && <span>Copy</span>}
    </button>
  )
}
