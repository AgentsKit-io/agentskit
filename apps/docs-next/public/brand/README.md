# AgentsKit brand assets

Direction **1.4 — Triangle / foam monochrome** (chosen 2026-04-15).

## What's here

- **`logo-mark.svg`** — the glyph alone (3 connected circles forming a triangle). Uses `currentColor` so it inherits text color.
- **`logo-wordmark.svg`** — glyph + `agentskit` lockup in JetBrains Mono.
- **`og-default.png`** — pre-rendered fallback (1200×630). The live OG endpoint at `/api/og` is preferred; this is for clients that can't follow it.

## Other locations

- **`/favicon.svg`** — square version with rounded background, baked colors.
- **`/apple-touch-icon.svg`** — same, larger, 36px corner radius.
- **`/api/og`** — dynamic OG image with optional `?title=` and `?description=` query params.

## Palette

```
midnight  #0D1117  background
foam      #E6EDF3  primary text + logo color
graphite  #8B949E  muted text
surface   #161B22  cards / popover
border    #30363D
green     #2EA043  success / active
blue      #58A6FF  links / focus ring
red       #F85149  error / destructive
```

## Usage rules

- Logo color = `currentColor`. Set the parent's `color` to flip dark/light without swapping files.
- Don't recolor the glyph except foam (#E6EDF3) on dark or midnight (#0D1117) on light.
- Don't apply effects (drop shadow, gradient fill, outline). The mark is intentionally flat.
- Minimum size: 16×16 (favicon) — at smaller sizes use the bitmap favicon.
- Wordmark always lowercase. Always `agentskit`, never `AgentsKit` in the lockup.

## Tokens

CSS variables defined in `apps/docs-next/app/global.css`:

```css
--ak-midnight    --ak-foam      --ak-graphite
--ak-surface     --ak-border
--ak-green       --ak-blue      --ak-red
```

Tailwind 4 `@theme` tokens (use as `bg-ak-midnight`, `text-ak-foam`, etc.) are also defined in `global.css`.
