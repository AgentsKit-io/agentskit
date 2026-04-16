# AgentsKit Design System

Single source of truth for visual design. All docs, marketing, OG images, demos, and components reference these tokens. Before adding a new color or font variant, check this file — the odds are it already exists.

Tokens live in `apps/docs-next/app/global.css` as CSS variables and are exposed to Tailwind via `@theme` (Tailwind v4). Use the token; never hardcode the hex.

---

## Brand direction

Terminal-inspired, developer-native, GitHub-adjacent. **Dark mode is the canonical palette** (how the brand renders in OG images, the logo, social posts). Light mode is the inverted-neutral companion for long-form reading.

**Feel:** clean, opinionated, monospace-forward, no corporate gradients, no decorative illustrations. Geometry and typography do the work.

---

## Color palette

### Dark mode (canonical)

| Token | Hex | Role |
|---|---|---|
| `--ak-midnight` | `#0D1117` | Page background |
| `--ak-surface` | `#161B22` | Panels, cards, code blocks |
| `--ak-border` | `#30363D` | Dividers, outlines, pill borders |
| `--ak-foam` | `#E6EDF3` | Primary text, logo fill |
| `--ak-graphite` | `#8B949E` | Secondary text, dim labels |
| `--ak-blue` | `#58A6FF` | Interactive accent, links, focus rings |
| `--ak-green` | `#2EA043` | Success, positive numbers, prompt glyph |
| `--ak-red` | `#F85149` | Errors, destructive actions |

### Light mode (inverted neutral)

| Token | Hex | Role |
|---|---|---|
| `--ak-midnight` | `#FFFFFF` | Page background |
| `--ak-surface` | `#F6F8FA` | Panels, cards |
| `--ak-border` | `#D0D7DE` | Dividers |
| `--ak-foam` | `#0D1117` | Primary text |
| `--ak-graphite` | `#57606A` | Secondary text |
| `--ak-blue` | `#0969DA` | Accent, links |
| `--ak-green` | `#1A7F37` | Success |
| `--ak-red` | `#CF222E` | Errors |

### Usage in Tailwind

```tsx
<div className="bg-ak-midnight text-ak-foam border-ak-border">
  <span className="text-ak-blue">links are blue</span>
  <span className="text-ak-green">$</span>
  <span className="text-ak-graphite">dim meta</span>
</div>
```

### Usage in CSS

```css
.panel {
  background: var(--ak-surface);
  border: 1px solid var(--ak-border);
  color: var(--ak-foam);
}
```

### Don't

- ❌ Hardcode `#0D1117` anywhere. Always `var(--ak-midnight)` or `bg-ak-midnight`.
- ❌ Invent new roles (e.g. "ak-purple", "ak-warning"). If you think you need one, open an issue.
- ❌ Use Tailwind's built-in palette (`text-slate-400`, `bg-zinc-900`). Stick to `ak-*`.
- ❌ Apply gradients larger than a faint radial accent. No candy colors, no hero gradients.

---

## Typography

### Families

| Token | Stack | Use for |
|---|---|---|
| `font-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Commands, code, technical labels, numbers in stats, logo-adjacent metadata |
| system sans (default) | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Long-form prose, UI copy, headings |

No decorative display font. Headings scale with weight + size, not a second family.

### Scale (Tailwind classes)

| Purpose | Class | Weight |
|---|---|---|
| Hero (desktop) | `text-5xl sm:text-6xl lg:text-7xl` | `font-bold` / `font-extrabold` |
| H2 section | `text-3xl sm:text-4xl` | `font-bold` |
| H3 subsection | `text-xl sm:text-2xl` | `font-semibold` |
| Body | `text-base` | `font-normal` |
| Meta / caption | `text-sm` or `text-xs` | `font-normal` |
| Eyebrow / label | `text-xs uppercase tracking-wider` | `font-mono` |

### Eyebrow pattern

Small monospace labels above headings — signature AgentsKit look:

```tsx
<div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">
  Built in the open
</div>
<h2 className="text-3xl font-bold text-ak-foam">...</h2>
```

---

## Spacing and layout

- **Radius:** `rounded-md` (6 px) for inputs/cards, `rounded-2xl` for large containers, `rounded-full` for pills and dots.
- **Borders:** `border-ak-border` as the default; `border-ak-blue` on hover/focus.
- **Max content width:** `max-w-6xl` for marketing, `max-w-4xl` for docs bodies.
- **Vertical rhythm:** sections separated by `py-20` (desktop) / `py-12` (mobile). Between cards inside a section: `gap-4` or `gap-6`.

---

## Components

### Install command card

- Two-card layout (`grid sm:grid-cols-2`) — scaffold command primary, install command secondary.
- Primary card gets `border-ak-blue/40` + a "recommended" pill.
- Terminal glyph `$` in `text-ak-green`, command text in `font-mono text-ak-foam`.
- Copy pill: idle = `text-ak-graphite`, copied = `text-ak-green border-ak-green`.

### Stat pill (social proof, issue counts)

```
[ value ] [ LABEL ]
```

- Monospace, uppercase label with wider tracking.
- Tone variants: `default` (graphite), `green` (open/good), `blue` (help-wanted).

### Code block

Fumadocs default. Don't override. Background already pulls `--color-fd-muted`.

### Buttons

- **Primary:** `bg-ak-foam text-ak-midnight` (solid), `hover:bg-white`.
- **Secondary:** `border-ak-border text-ak-foam hover:border-ak-blue`.
- **Tertiary/ghost:** `text-ak-foam hover:text-ak-blue`.

No filled-blue primary button — the blue is reserved for inline links and accent glyphs.

---

## Logo

**The triangle** — three solid white circles at the vertices of an equilateral triangle, connected by thin foam lines at 50 % opacity. Monochrome foam on midnight (dark) or midnight on white (light). Never colored.

Reference implementations:
- `apps/docs-next/components/brand/animated-logo.tsx` — the hero logo
- `apps/docs-next/app/og/core-v1/route.tsx` — inline SVG for OG image

Proportions (viewBox 280 × 280):
- Top circle: `cx=140 cy=70 r=12`
- Bottom-left: `cx=60 cy=210 r=12`
- Bottom-right: `cx=220 cy=210 r=12`
- Lines: `strokeWidth=2 strokeOpacity=0.5`

Clear space: minimum padding of one circle diameter on all sides.

### Don't

- ❌ Fill the circles with color other than foam.
- ❌ Add text inside the triangle.
- ❌ Render at less than 24 px total height (switches to favicon mark instead).
- ❌ Stroke the circles; they are always solid.

---

## Animation and motion

- Default transition: `transition duration-200 ease-out`.
- Fade-in entrance: `animate-fade-in` (320 ms, defined in `global.css`).
- Avoid parallax, stagger grids, or motion that blocks the user from reading.
- Hover: color shift only, no scale/translate.

---

## Imagery and iconography

- **Icons:** [Lucide](https://lucide.dev) — thin stroke, no filled variants.
- **Illustrations:** none. Geometry + typography. If a diagram is needed, use inline SVG matching the palette.
- **Screenshots:** preferred over stock photos or rendered mockups.

---

## OG images and social

- Canvas: 1200 × 630, midnight background with faint radial accent at 8 % opacity.
- Thin grid overlay at 3 % opacity (`60 × 60 px`).
- Left third: logo. Right two-thirds: eyebrow (blue mono), huge title (foam), subtitle (foam), stats line (green mono).
- Reference: `apps/docs-next/app/og/core-v1/route.tsx`.

---

## Accessibility

- Body contrast meets WCAG AA in both modes.
- Never use color alone to signal state — pair with a glyph or label (✓, ●, text).
- Focus rings: `ring-2 ring-ak-blue` on interactive elements. Don't remove defaults without replacement.
- Motion respects `prefers-reduced-motion` — disable `animate-fade-in` in that case.

---

## Checklist for new UI

Before merging a PR that adds visible UI:

- [ ] No hardcoded hex values — uses `ak-*` tokens only.
- [ ] Works in both light and dark mode.
- [ ] Monospace used only for code, commands, metric numbers, eyebrows.
- [ ] No new color role or font family added.
- [ ] Hover + focus states defined and use brand tokens.
- [ ] Contrast passes AA in both modes.
- [ ] Motion is subtle and respects `prefers-reduced-motion`.
