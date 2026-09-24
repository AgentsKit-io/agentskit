# AgentsKit Design System

Single source of truth for visual design. All docs, marketing, OG images, demos, and components reference these tokens. Before adding a new color or font variant, check this file — the odds are it already exists.

Tokens live in `apps/docs-next/app/global.css` as CSS variables and are exposed to Tailwind via `@theme` (Tailwind v4). Use the token; never hardcode the hex.

---

## Brand direction

Developer-native and editorial, with a quiet reading surface across documentation and a more expressive product experience on the homepage. **Dark mode is the canonical palette** (how the brand renders in OG images, the logo, social posts). Light mode is the inverted-neutral companion for long-form reading.

**Feel:** clean, opinionated, and product-led. Monospace supports technical detail; system sans carries interface and marketing copy. Geometry and typography do the work, with restrained liquid light only on the homepage.

## Surface rules

The homepage and documentation have different jobs and should share tokens without sharing every effect.

### Homepage

- Use a dark, nearly black base with low-opacity blue and green radial light. The light is ambient across the full homepage and responds softly to a mouse pointer; it must never reduce text contrast.
- Keep the pointer layer in the homepage route only. Disable its movement for reduced motion and ignore touch pointers.
- Use system sans for large headlines, moderate negative tracking, generous whitespace, and a clear action hierarchy. Keep monospace for code, commands, metrics, and small technical labels.
- Keep the hero headline immediately visible without entrance motion. Reserve motion for the framework reel and product proof where it explains the system.
- The ecosystem map keeps animated connection lines on tablet and desktop; hide those lines on phone widths and let the core and layer list stack cleanly.
- Keep the interactive ecosystem tour neutral on the AgentsKit homepage: one restrained accent, quiet borders, and no competing product colors. Apply this home-only treatment through the `data-visual="agentskit-home"` host attribute so sibling product tours retain their own accents.
- Reserve glass for floating or focal surfaces: the global ecosystem header, product demo/chat, Ask docs controls, and footer. Use a subtle token border, translucent surface, blur, and restrained shadow.
- Use rounded 24 px corners for large demo surfaces and full pills for primary actions. Small controls and code surfaces retain the existing compact radius.
- Keep sections open against the shared page background. Avoid enclosing every section in a card or layering multiple competing gradients.

### Documentation and interior pages

- Keep Fumadocs reading surfaces calm, solid, and high contrast. Do not load the liquid cursor layer, ambient homepage gradients, or homepage glass treatments on documentation routes.
- The ecosystem navigation remains readable with a solid background on interior pages. Body copy, code blocks, tables, and navigation should not sit over moving light.
- Preserve the existing Fumadocs typography, code presentation, theme toggle, and content behavior.

### Reuse across the ecosystem

- Reuse the palette and logo rules below; do not copy the homepage cursor effect into sibling product docs by default.
- For a sibling homepage, use its existing product accent with the same low-opacity, pointer-reactive treatment and the same calm documentation boundary.
- Keep the wordmark “AgentsKit” in public brand copy and metadata. Preserve package and repository identifiers where they are technical names.
- Glass must remain legible in dark and light themes. Prefer opaque surfaces when contrast cannot be maintained over the background.

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
- ❌ Add decorative or saturated gradients to documentation, code, or reading surfaces.
- ❌ Use multiple competing liquid layers or glass every content section.

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
