/**
 * AgentsKit shell v1 — shared chrome for the AgentsKit product family.
 *
 *   <link rel="stylesheet" href="https://www.agentskit.io/shell/v1.css">
 *   <script src="https://www.agentskit.io/shell/v1.js" data-current="registry"
 *           data-current-repo="AgentsKit-io/agentskit-registry" defer></script>
 *
 * Self-contained, zero deps. Auto-injects the ecosystem bar at the top of
 * <body> and defines <agentskit-ecosystem>, <agentskit-footer>, and
 * <agentskit-aurora>. The same file is served as /ecosystem-bar.js for
 * consumers that have not migrated yet. Compatible changes ship inside v1;
 * breaking changes go to /shell/v2.*.
 */
(function () {
  var barAlreadyInjected = window.__akEcosystemBar
  window.__akEcosystemBar = true
  window.__akShell = window.__akShell || { version: 1 }

  // ecobar:props-start — GENERATED from ecosystem.json by scripts/sync-ecosystem.mjs. Do not edit by hand.
  var PROPS = [
    { id: "agentskit", label: "AgentsKit", host: "www.agentskit.io", url: "https://www.agentskit.io", repo: "AgentsKit-io/agentskit" },
    { id: "registry", label: "Registry", host: "registry.agentskit.io", url: "https://registry.agentskit.io", repo: "AgentsKit-io/agentskit-registry" },
    { id: "agentskit-chat", label: "Chat", host: "chat.agentskit.io", url: "https://chat.agentskit.io", repo: "AgentsKit-io/agentskit-chat" },
    { id: "doc-bridge", label: "Doc Bridge", host: "doc-bridge.agentskit.io", url: "https://doc-bridge.agentskit.io/", repo: "AgentsKit-io/doc-bridge" },
    { id: "code-review", label: "Code Review", host: "code-review.agentskit.io", url: "https://code-review.agentskit.io", repo: "AgentsKit-io/code-review" },
    { id: "harness", label: "Harness", host: "harness.agentskit.io", url: "https://harness.agentskit.io/", repo: "AgentsKit-io/harness" },
  ]
  // ecobar:props-end

  // ecobar:showcase-start — GENERATED from ecosystem.json by scripts/sync-ecosystem.mjs. Do not edit by hand.
  var SHOWCASE_PRODUCTS = [
    {
      "id": "agentskit",
      "name": "AgentsKit",
      "shortName": "AgentsKit",
      "accent": "#2EA043",
      "href": "https://www.agentskit.io/docs",
      "claimSource": {
        "url": "https://www.agentskit.io/api/stats.json",
        "claims": {
          "packages": {
            "path": "counts.packages"
          },
          "core-size-kb-gzip": {
            "path": "coreSizeKbGzip"
          },
          "catalog-providers": {
            "path": "counts.catalogProviders"
          },
          "native-adapters": {
            "path": "counts.nativeAdapters"
          },
          "integrations": {
            "path": "counts.integrations"
          }
        }
      },
      "stage": "Build",
      "headline": "One foundation. Every layer stays yours.",
      "detail": "Compose runtime, adapters, tools, memory, RAG, and UI without glue code or lock-in.",
      "proof": "22 packages · 10 KB core budget",
      "sales": {
        "kind": "integration-stack",
        "headline": "Swap the stack. Keep the agent.",
        "metrics": [
          {
            "value": "140+",
            "label": "providers"
          },
          {
            "value": "25",
            "label": "adapters"
          },
          {
            "value": "50",
            "label": "integrations"
          }
        ],
        "capabilities": [
          "Tools",
          "RAG",
          "Memory",
          "MCP"
        ],
        "steps": [
          "Choose any adapter",
          "Add tools and memory",
          "Ship without rewrites"
        ]
      },
      "cta": "Build with AgentsKit"
    },
    {
      "id": "registry",
      "name": "AgentsKit Registry",
      "shortName": "Registry",
      "accent": "#58A6FF",
      "href": "https://registry.agentskit.io/docs",
      "claimSource": {
        "url": "https://registry.agentskit.io/r/index.json",
        "claims": {
          "agents": {
            "path": "agents",
            "aggregate": "length"
          },
          "remaining-categories": {
            "path": "agents",
            "aggregate": "distinct",
            "field": "category",
            "subtract": 5
          }
        }
      },
      "stage": "Discover",
      "headline": "Shadcn-like agents. Installed as source.",
      "detail": "Find a working agent, copy its source into your project, and change every line.",
      "proof": "Ready-made · source-owned",
      "sales": {
        "kind": "registry-install",
        "headline": "Inspect every file before it ships.",
        "metric": "Source-owned",
        "metricLabel": "agent code",
        "capabilities": [
          "Ready-made agents",
          "Source ownership",
          "CLI installation"
        ],
        "steps": [
          "Find the right agent",
          "Run npx @agentskit/cli add",
          "Own every line"
        ],
        "command": "npx @agentskit/cli add research"
      },
      "cta": "Explore the Registry"
    },
    {
      "id": "agentskit-chat",
      "name": "AgentsKit Chat",
      "shortName": "Chat",
      "accent": "#F59E0B",
      "href": "https://chat.agentskit.io/docs",
      "stage": "Deliver",
      "headline": "One agent. Every conversation surface.",
      "detail": "Define the experience once and connect the conversation surface that fits the product.",
      "proof": "Human ↔ agent · shared experience",
      "sales": {
        "kind": "human-agent",
        "headline": "Human ↔ agent. Without losing control.",
        "metric": "One",
        "metricLabel": "agent experience",
        "logos": [
          {
            "id": "human",
            "label": "Human"
          },
          {
            "id": "agent",
            "label": "Agent"
          },
          {
            "id": "tools",
            "label": "Tools"
          }
        ],
        "capabilities": [
          "Conversation",
          "Human control",
          "Tool results"
        ],
        "steps": [
          "Define the agent experience",
          "Connect the conversation surface",
          "Keep the human in control"
        ]
      },
      "cta": "Explore AgentsKit Chat"
    },
    {
      "id": "doc-bridge",
      "name": "Doc Bridge",
      "shortName": "Doc Bridge",
      "accent": "#06B6D4",
      "href": "https://doc-bridge.agentskit.io/",
      "stage": "Understand",
      "headline": "Documentation that hands work off precisely.",
      "detail": "Connect repository knowledge to agents with structured, executable context.",
      "proof": "Code → precise handoff",
      "sales": {
        "kind": "knowledge-bridge",
        "headline": "Knowledge flows both ways.",
        "metric": "↔",
        "metricLabel": "humans and agents",
        "logos": [
          {
            "id": "human",
            "label": "Humans"
          },
          {
            "id": "markdown",
            "label": "Docs"
          },
          {
            "id": "code",
            "label": "Code"
          },
          {
            "id": "agent",
            "label": "Agents"
          }
        ],
        "capabilities": [
          "ADRs",
          "Handoffs",
          "Agent findings",
          "Human-readable docs"
        ],
        "steps": [
          "Humans document decisions",
          "Agents receive precise context",
          "Agent findings return to humans"
        ]
      },
      "cta": "Explore Doc Bridge"
    },
    {
      "id": "code-review",
      "name": "AgentsKit Code Review",
      "shortName": "Code Review",
      "accent": "#F97316",
      "href": "https://code-review.agentskit.io/docs",
      "stage": "Review",
      "headline": "A review you can tune. Findings you can act on.",
      "detail": "Choose the concerns that matter and see the review comments adapt to the change.",
      "proof": "Configurable · provider-neutral · open source",
      "sales": {
        "kind": "review-config",
        "headline": "Set the standard for every review.",
        "metric": "2",
        "metricLabel": "review profiles",
        "capabilities": [
          "Security",
          "Performance",
          "Correctness",
          "Actionable comments"
        ],
        "steps": [
          "Choose security or performance",
          "Apply your review configuration",
          "Get focused, actionable comments"
        ]
      },
      "cta": "Explore Code Review"
    },
    {
      "id": "harness",
      "name": "AgentsKit Harness",
      "shortName": "Harness",
      "accent": "#F778BA",
      "href": "https://harness.agentskit.io/docs",
      "stage": "Ship",
      "headline": "From a vague objective to production, unattended.",
      "detail": "Interview, plan, vote, build, review, prove, merge, release — one state machine per stage, with humans only where the loop acts on the world.",
      "proof": "Objective → released change",
      "sales": {
        "kind": "standards-flow",
        "headline": "The loop keeps pushing while you sleep.",
        "metric": "24/7",
        "metricLabel": "unattended delivery",
        "logos": [
          {
            "id": "issue",
            "label": "Issues"
          },
          {
            "id": "worktree",
            "label": "Worktrees"
          },
          {
            "id": "review",
            "label": "Review"
          },
          {
            "id": "release",
            "label": "Release"
          }
        ],
        "capabilities": [
          "Frozen contracts",
          "Plan with votes",
          "Definition of done",
          "Human gates"
        ],
        "steps": [
          "An issue becomes a contract nobody can widen",
          "A worker proves it in its own worktree",
          "A human approves what reaches production"
        ]
      },
      "cta": "Explore Harness"
    }
  ]
  // ecobar:showcase-end

  // ecobar:catalog-start — GENERATED from ecosystem.json by scripts/sync-ecosystem.mjs. Do not edit by hand.
  var CATALOG = {
    "agentskit": {
      "name": "AgentsKit",
      "shortName": "AgentsKit",
      "repo": "AgentsKit-io/agentskit",
      "url": "https://www.agentskit.io"
    },
    "registry": {
      "name": "AgentsKit Registry",
      "shortName": "Registry",
      "repo": "AgentsKit-io/agentskit-registry",
      "url": "https://registry.agentskit.io"
    },
    "agentskit-chat": {
      "name": "AgentsKit Chat",
      "shortName": "Chat",
      "repo": "AgentsKit-io/agentskit-chat",
      "url": "https://chat.agentskit.io"
    },
    "doc-bridge": {
      "name": "Doc Bridge",
      "shortName": "Doc Bridge",
      "repo": "AgentsKit-io/doc-bridge",
      "url": "https://doc-bridge.agentskit.io/"
    },
    "code-review": {
      "name": "AgentsKit Code Review",
      "shortName": "Code Review",
      "repo": "AgentsKit-io/code-review",
      "url": "https://code-review.agentskit.io"
    },
    "harness": {
      "name": "AgentsKit Harness",
      "shortName": "Harness",
      "repo": "AgentsKit-io/harness",
      "url": "https://harness.agentskit.io/"
    },
    "playbook": {
      "name": "Agents Playbook",
      "shortName": "Playbook",
      "repo": "AgentsKit-io/agents-playbook",
      "url": "https://playbook.agentskit.io"
    }
  }
  // ecobar:catalog-end

  // currentScript is null when the shell is injected as a module or by some loaders; fall back to
  // the tag that references it so data-current still applies.
  var script = document.currentScript ||
    document.querySelector('script[src*="/shell/v1.js"],script[src*="/ecosystem-bar.js"]')
  var currentRepoOverride = script && script.getAttribute('data-current-repo')
  var host = location.hostname
  // Match agentskit.io only as the registrable domain suffix (not a substring,
  // so evil-agentskit.io.attacker.test does not match).
  var isAgentskit = host === 'agentskit.io' || /\.agentskit\.io$/.test(host)
  var current =
    (script && script.getAttribute('data-current')) ||
    (PROPS.filter(function (p) { return host === p.host })[0] || {}).id ||
    (isAgentskit ? host.split('.')[0] : '') ||
    ''

  // Theme resolution shared by the shell: an explicit dark/light class or data-theme on <html>
  // (Fumadocs, next-themes) wins; otherwise follow the operating system preference.
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
  function isDarkTheme() {
    var docEl = document.documentElement
    var theme = docEl.getAttribute('data-theme')
    if (docEl.classList.contains('dark') || theme === 'dark') return true
    if (docEl.classList.contains('light') || theme === 'light') return false
    return Boolean(darkQuery && darkQuery.matches)
  }

  // Surface override: a page region that is dark (or light) by design, regardless of the page theme,
  // declares it with data-ak-surface="dark|light" on <body> or on any element inside it. The bar,
  // tour, footer, and aurora then use that surface's palette. The shell only writes a style tag in
  // <head>, never attributes on server-rendered markup, so hydration is unaffected.
  var SURFACE_TOKENS = {
    dark: '--ak-bg:#0d1117;--ak-surface:#161b22;--ak-border:#30363d;--ak-fg:#e6edf3;--ak-muted:#8b949e;--ak-graphite:#8b949e;--ak-blue:#58a6ff;--ak-green:#2ea043;--ak-red:#f85149;color-scheme:dark',
    light: '--ak-bg:#ffffff;--ak-surface:#f6f8fa;--ak-border:#d0d7de;--ak-fg:#0d1117;--ak-muted:#57606a;--ak-graphite:#57606a;--ak-blue:#0969da;--ak-green:#1a7f37;--ak-red:#cf222e;color-scheme:light',
  }
  var activeSurface = null

  function readSurface() {
    var body = document.body
    if (!body) return null
    var holder = body.hasAttribute('data-ak-surface') ? body : body.querySelector('[data-ak-surface]')
    var value = holder && holder.getAttribute('data-ak-surface')
    return value === 'dark' || value === 'light' ? value : null
  }

  function applySurface() {
    var next = readSurface()
    if (next === activeSurface) return
    activeSurface = next
    var style = document.getElementById('ak-shell-surface')
    if (!next) {
      if (style) style.textContent = ''
    } else {
      if (!style) {
        style = document.createElement('style')
        style.id = 'ak-shell-surface'
        document.head.appendChild(style)
      }
      style.textContent = '#ak-eco,agentskit-ecosystem,agentskit-footer,agentskit-aurora{' + SURFACE_TOKENS[next] + '}'
    }
    window.dispatchEvent(new CustomEvent('ak:surface-change', { detail: { surface: next } }))
  }

  function watchSurface() {
    applySurface()
    var queued = false
    new MutationObserver(function () {
      if (queued) return
      queued = true
      window.requestAnimationFrame(function () {
        queued = false
        applySurface()
      })
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ak-surface'] })
  }

  // Fonts: v1.css stays render-non-blocking, so the shell adds Inter and Space Grotesk itself,
  // asynchronously, and only for families the page does not already provide (next/font and other
  // self-hosted faces keep their real family names). data-ak-fonts="self" on the script opts out.
  function loadFonts() {
    if ((script && script.getAttribute('data-ak-fonts') === 'self') || document.getElementById('ak-shell-fonts')) return
    var present = function (family) {
      if (document.fonts && typeof document.fonts.forEach === 'function') {
        var found = false
        document.fonts.forEach(function (face) {
          if (String(face.family).replace(/["']/g, '').trim().toLowerCase() === family.toLowerCase()) found = true
        })
        if (found) return true
      }
      return Boolean(document.querySelector('link[href*="fonts.googleapis.com"][href*="' + family.replace(/ /g, '+') + '"]'))
    }
    var families = []
    if (!present('Inter')) families.push('family=Inter:wght@400;500;600;700')
    if (!present('Space Grotesk')) families.push('family=Space+Grotesk:wght@500;600;700')
    if (!families.length) return
    ;['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach(function (origin) {
      var hint = document.createElement('link')
      hint.rel = 'preconnect'
      hint.href = origin
      if (origin.indexOf('gstatic') !== -1) hint.crossOrigin = 'anonymous'
      document.head.appendChild(hint)
    })
    var sheet = document.createElement('link')
    sheet.id = 'ak-shell-fonts'
    sheet.rel = 'stylesheet'
    sheet.href = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap'
    sheet.media = 'print'
    sheet.onload = function () { sheet.media = 'all' }
    document.head.appendChild(sheet)
  }

  function repoFor(productId) {
    var entry = CATALOG[productId]
    return entry && entry.repo ? entry.repo : null
  }

  var css =
    '#ak-eco{position:relative;z-index:30;box-sizing:border-box;display:flex;gap:4px;align-items:center;width:100%;' +
    'font:500 13px/1 var(--ak-font-body,Inter,ui-sans-serif,system-ui,-apple-system,sans-serif);padding:6px 16px;' +
    'background:var(--ak-bg,#0d1117);color:var(--ak-fg,#e6edf3);border-bottom:1px solid var(--ak-border,#30363d)}' +
    'body:has(agentskit-aurora) #ak-eco{background:color-mix(in srgb,var(--ak-bg,#0d1117) 64%,transparent);' +
    'border-bottom-color:color-mix(in srgb,var(--ak-border,#30363d) 78%,transparent);' +
    '-webkit-backdrop-filter:blur(24px) saturate(140%);backdrop-filter:blur(24px) saturate(140%)}' +
    '#ak-eco .ak-eco-brand{box-sizing:border-box;display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;' +
    'min-width:44px;min-height:44px;margin-right:4px;color:var(--ak-fg,#e6edf3);text-decoration:none;line-height:0;border-radius:8px}' +
    '#ak-eco .ak-eco-brand svg{width:18px;height:16px;display:block}' +
    '#ak-eco a.ak-eco-link{box-sizing:border-box;display:inline-flex;flex:0 0 auto;align-items:center;min-height:44px;color:var(--ak-muted,#8b949e);text-decoration:none;padding:5px 10px;border-radius:8px;white-space:nowrap;transition:color 160ms ease,background-color 160ms ease}' +
    '#ak-eco a.ak-eco-link:hover{color:var(--ak-fg,#e6edf3);background:color-mix(in srgb,var(--ak-surface,#161b22) 82%,transparent)}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:var(--ak-fg,#e6edf3);background:var(--ak-surface,#161b22);font-weight:600}' +
    '#ak-eco a:focus-visible{outline:2px solid var(--ak-accent,#58a6ff);outline-offset:-2px}' +
    '#ak-eco .ak-eco-products{display:flex;gap:2px;align-items:center;min-width:0}' +
    '#ak-eco .ak-eco-spacer{flex:1}' +
    '#ak-eco a.ak-eco-cta{display:inline-flex;align-items:center;gap:6px}' +
    '#ak-eco a.ak-eco-cta svg{width:14px;height:14px;fill:currentColor}' +
    // Discord is kept in the DOM for an easy restore; hidden until community is ready.
    '#ak-eco a.ak-eco-cta[data-ak-eco-discord]{display:none}' +
    '@media(max-width:767px){#ak-eco{max-width:100vw;overflow:hidden;padding:4px 8px}' +
    '#ak-eco .ak-eco-products{flex:1;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}' +
    '#ak-eco .ak-eco-products::-webkit-scrollbar{display:none}' +
    '#ak-eco .ak-eco-spacer{display:none}' +
    '#ak-eco a.ak-eco-cta:not([data-ak-eco-discord]){justify-content:center;width:44px;min-width:44px;padding:5px}' +
    '#ak-eco a.ak-eco-cta:not([data-ak-eco-discord]) span{display:none}}' +
    '@media(prefers-reduced-motion:reduce){#ak-eco a.ak-eco-link{transition:none}}'

  var SHOWCASE_CSS = `
    :host{display:block;color-scheme:dark;--akx-accent:#2ea043;--akx-bg:#0b0f14;--akx-surface:#11171e;--akx-line:#27313a;--akx-fg:#e7edf4;--akx-muted:#8b98a6;font-family:var(--ak-font-body,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}
    *{box-sizing:border-box}
    button,a{font:inherit}
    .akx-shell{overflow:hidden;background:transparent;color:var(--akx-fg);border-block:1px solid var(--akx-line)}
    .akx-inner{max-width:1152px;margin:0 auto;padding:80px 24px}
    .akx-intro{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(18rem,.8fr);align-items:end;gap:48px;padding-bottom:32px}
    .akx-eyebrow,.akx-stage-label,.akx-index,.akx-proof,.akx-metric-label{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-transform:uppercase;letter-spacing:.17em}
    .akx-eyebrow{margin:0 0 14px;color:var(--akx-muted);font-size:11px}
    .akx-title{max-width:720px;margin:0;font-size:clamp(2.1rem,5vw,4rem);line-height:1.02;letter-spacing:-.045em}
    .akx-intro-copy{max-width:520px;margin:0;color:var(--akx-muted);font-size:16px;line-height:1.7}
    .akx-frame{overflow:hidden;border:1px solid color-mix(in srgb,var(--akx-line) 82%,transparent);border-radius:24px;background:color-mix(in srgb,var(--akx-surface) 28%,transparent)}
    .akx-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));overflow-x:auto;border-bottom:1px solid color-mix(in srgb,var(--akx-line) 72%,transparent);scrollbar-width:none}
    .akx-tabs::-webkit-scrollbar{display:none}
    .akx-tab{position:relative;min-height:68px;border:0;background:transparent;color:var(--akx-muted);--akx-accent:var(--akx-muted)!important;cursor:pointer;padding:12px;text-align:left;transition:color 180ms cubic-bezier(.25,1,.5,1),background 180ms cubic-bezier(.25,1,.5,1)}
    .akx-tab:hover{color:var(--akx-fg);background:rgba(255,255,255,.025)}
    .akx-tab:focus-visible{outline:2px solid var(--akx-accent);outline-offset:-3px}
    .akx-tab[aria-selected="true"]{--akx-accent:inherit!important;color:var(--akx-fg);background:rgba(255,255,255,.035);box-shadow:inset 0 -2px 0 var(--akx-accent)}
    .akx-tab-stage{display:block;margin-bottom:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--akx-accent)}
    .akx-tab-name{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:650;white-space:nowrap}
    .akx-current-dot{width:5px;height:5px;border-radius:50%;background:var(--akx-accent)}
    .akx-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:360px}
    .akx-story{display:flex;flex-direction:column;padding:36px}
    .akx-story-top{display:flex;align-items:center;justify-content:space-between;gap:20px}
    .akx-stage-label,.akx-index{margin:0;font-size:10px;color:var(--akx-muted)}
    .akx-stage-label{color:var(--akx-accent)}
    .akx-headline{max-width:610px;margin:38px 0 0;font-size:clamp(2rem,4vw,3.25rem);line-height:1.03;letter-spacing:-.04em}
    .akx-detail{max-width:560px;margin:20px 0 0;color:var(--akx-muted);font-size:16px;line-height:1.65}
    .akx-story-bottom{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-top:auto;padding-top:48px}
    .akx-proof{margin:0;color:var(--akx-fg);font-size:10px;line-height:1.6}
    .akx-cta{display:inline-flex;min-height:44px;align-items:center;color:var(--akx-accent);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;text-decoration:none;white-space:nowrap;transition:color 180ms cubic-bezier(.25,1,.5,1),transform 180ms cubic-bezier(.25,1,.5,1)}
    .akx-cta:hover{color:var(--akx-fg);transform:translateX(3px)}
    .akx-cta:focus-visible{outline:2px solid var(--akx-accent);outline-offset:4px}
    .akx-sales{display:flex;min-width:0;flex-direction:column;padding:36px;background:transparent}
    .akx-sales-top{display:flex;align-items:start;justify-content:space-between;gap:24px}
    .akx-sales-headline{max-width:330px;margin:0;font-size:clamp(1.35rem,2.4vw,2rem);line-height:1.08;letter-spacing:-.03em}
    .akx-demo{position:relative;display:flex;flex:1;flex-direction:column;justify-content:center;gap:0;margin-top:28px;border-top:1px solid color-mix(in srgb,var(--akx-line) 72%,transparent);padding:12px 0 0}
    .akx-demo-step{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:12px;min-height:58px;padding:8px 0;background:transparent;border-bottom:1px solid color-mix(in srgb,var(--akx-line) 50%,transparent);opacity:0;transform:translateY(5px);animation:akx-step-in 340ms cubic-bezier(.25,1,.5,1) forwards;animation-delay:calc(var(--akx-step) * 70ms)}
    .akx-demo-step:last-child{border-bottom:0}
    .akx-demo-index{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;color:var(--akx-accent);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;letter-spacing:.06em}
    .akx-demo-text{font-size:12px;font-weight:600;line-height:1.4}
    .akx-demo-step::before{display:none}
    .akx-command{display:flex;align-items:center;gap:10px;border:1px solid var(--akx-line);background:#090d11;padding:11px 13px;color:var(--akx-fg);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;overflow-wrap:anywhere}
    .akx-command::before{content:"$";color:var(--akx-accent)}
    @keyframes akx-step-in{to{opacity:1;transform:translateY(0)}}
    .akx-controls{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid color-mix(in srgb,var(--akx-line) 72%,transparent);padding:8px 16px;color:var(--akx-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:.08em}
    .akx-play{min-height:44px;border:0;background:transparent;color:var(--akx-muted);cursor:pointer;padding:0 8px;text-transform:uppercase;letter-spacing:.12em}
    .akx-play:hover{color:var(--akx-fg)}
    .akx-play:focus-visible{outline:2px solid var(--akx-accent);outline-offset:2px}
    @media(max-width:820px){.akx-inner{padding:56px 20px}.akx-intro{grid-template-columns:1fr;gap:16px}.akx-tabs{grid-template-columns:repeat(6,minmax(128px,1fr))}.akx-content{grid-template-columns:1fr}.akx-story{padding:28px 32px 32px;border-bottom:1px solid color-mix(in srgb,var(--akx-line) 72%,transparent)}.akx-sales{min-height:300px;padding:28px 32px 32px}.akx-headline{margin-top:28px}}
    @media(max-width:540px){.akx-inner{padding:44px 16px}.akx-intro{padding-bottom:24px}.akx-frame{border-radius:20px}.akx-tab{min-height:62px;padding:10px}.akx-story{padding:24px 20px 28px}.akx-story-bottom{align-items:flex-start;flex-direction:column;gap:12px;padding-top:28px}.akx-sales{min-height:0;padding:24px 20px 28px}.akx-sales-headline{font-size:1.3rem}.akx-demo{margin-top:20px}.akx-demo-step{grid-template-columns:26px minmax(0,1fr);min-height:52px}.akx-controls{padding-inline:12px}.akx-controls span{max-width:72%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
    .akx-title,.akx-headline,.akx-sales-headline{font-family:var(--ak-font-display,"Space Grotesk",Inter,ui-sans-serif,system-ui,sans-serif)}
    @media(prefers-reduced-motion:reduce){.akx-demo-step{opacity:1;transform:none;animation:none}.akx-cta,.akx-tab{transition:none}}
    :host([data-visual="agentskit-home"]){color-scheme:light dark;--akx-bg:var(--ak-bg,#fff);--akx-surface:var(--ak-surface,#f6f8fa);--akx-line:var(--ak-border,#d0d7de);--akx-fg:var(--ak-fg,#0d1117);--akx-muted:var(--ak-muted,#57606a)}
    :host([data-visual="agentskit-home"]) .akx-shell{--akx-accent:var(--ak-graphite,var(--ak-muted,#8b949e))!important;border:0}
    :host([data-visual="agentskit-home"]) .akx-frame{background:color-mix(in srgb,var(--akx-bg) 72%,transparent);backdrop-filter:blur(22px);box-shadow:0 18px 60px rgba(0,0,0,.12)}
    :host([data-visual="agentskit-home"]) .akx-tab{--akx-accent:var(--ak-graphite,var(--ak-muted,#8b949e))!important;border-right:0}
    :host([data-visual="agentskit-home"]) .akx-tab:hover,:host([data-visual="agentskit-home"]) .akx-tab[aria-selected="true"]{background:color-mix(in srgb,var(--akx-surface) 72%,transparent)}
    :host([data-visual="agentskit-home"]) .akx-story{border-color:color-mix(in srgb,var(--ak-border,#30363d) 65%,transparent)}
    :host([data-visual="agentskit-home"]) .akx-demo{border-color:color-mix(in srgb,var(--ak-border,#30363d) 65%,transparent)}
    :host([data-visual="agentskit-home"]) .akx-demo-step{background:color-mix(in srgb,var(--akx-surface) 56%,transparent)}
  `

  // Brand mark only (no "AgentsKit" wordmark) — product list still includes AgentsKit.
  var BRAND_ICON =
    '<svg viewBox="0 0 72 64" fill="none" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
    '<line x1="12" y1="52" x2="36" y2="12"/>' +
    '<line x1="36" y1="12" x2="60" y2="52"/>' +
    '<line x1="12" y1="52" x2="60" y2="52"/>' +
    '</g>' +
    '<circle cx="36" cy="12" r="6" fill="currentColor"/>' +
    '<circle cx="12" cy="52" r="6" fill="currentColor"/>' +
    '<circle cx="60" cy="52" r="6" fill="currentColor"/>' +
    '</svg>'

  // Community links — pinned to the right of the bar (after the spacer). Project
  // surfaces only: no personal-brand links. Icons are inline SVG (zero deps).
  var GH_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>'
  var DISCORD_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.55 3.01A13.2 13.2 0 0 0 10.3 2l-.16.33c1.1.27 1.6.66 2.13 1.13a7.5 7.5 0 0 0-2.6-.83 9.6 9.6 0 0 0-3.34 0 7.5 7.5 0 0 0-2.6.83c.53-.47 1.13-.9 2.13-1.13L5.7 2c-1.16.2-2.26.55-3.25 1.01C.6 6.05.13 9 .36 11.92a13.3 13.3 0 0 0 3.97 2c.32-.43.6-.9.84-1.38-.46-.17-.9-.39-1.32-.65l.32-.24c2.55 1.18 5.3 1.18 7.82 0l.33.24c-.42.26-.86.48-1.32.65.24.48.52.94.84 1.38a13.2 13.2 0 0 0 3.98-2c.27-3.38-.47-6.3-2.07-8.91zM5.5 10.16c-.78 0-1.42-.71-1.42-1.59 0-.87.63-1.59 1.42-1.59.79 0 1.43.72 1.42 1.59 0 .88-.63 1.59-1.42 1.59zm5.01 0c-.78 0-1.42-.71-1.42-1.59 0-.87.63-1.59 1.42-1.59.79 0 1.43.72 1.42 1.59 0 .88-.63 1.59-1.42 1.59z"/></svg>'

  function registerEcosystemShowcase() {
    if (!window.customElements || customElements.get('agentskit-ecosystem')) return

    class AgentsKitEcosystem extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return

        this.activeIndex = Math.max(0, SHOWCASE_PRODUCTS.findIndex(function (product) {
          return product.id === (this.getAttribute('current') || this.getAttribute('data-current') || current)
        }, this))
        this.currentProduct = this.getAttribute('current') || this.getAttribute('data-current') || current
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.manualPaused = false
        this.transientPaused = false
        this.timer = null

        var root = this.attachShadow({ mode: 'open' })
        root.innerHTML =
          '<style>' + SHOWCASE_CSS + '</style>' +
          '<section class="akx-shell" aria-labelledby="akx-title">' +
            '<div class="akx-inner">' +
              '<header class="akx-intro">' +
                '<div><p class="akx-eyebrow">The AgentsKit ecosystem</p><h2 class="akx-title" id="akx-title">Build the agent. Then take it all the way.</h2></div>' +
                '<p class="akx-intro-copy">One connected toolkit to discover working agents, compose their foundation, deliver the experience, align teams, transfer knowledge, and operate in production.</p>' +
              '</header>' +
              '<div class="akx-frame">' +
                '<div class="akx-tabs" role="tablist" aria-label="AgentsKit ecosystem products"></div>' +
                '<div class="akx-content" role="tabpanel" aria-live="polite">' +
                  '<article class="akx-story">' +
                    '<div class="akx-story-top"><p class="akx-stage-label"></p><p class="akx-index"></p></div>' +
                    '<h3 class="akx-headline"></h3>' +
                    '<p class="akx-detail"></p>' +
                    '<div class="akx-story-bottom"><p class="akx-proof"></p><a class="akx-cta" target="_blank" rel="noopener noreferrer"></a></div>' +
                  '</article>' +
                  '<aside class="akx-sales" aria-label="Product proof"></aside>' +
                '</div>' +
                '<div class="akx-controls"><span class="akx-status"></span><button class="akx-play" type="button"></button></div>' +
              '</div>' +
            '</div>' +
          '</section>'

        this.shell = root.querySelector('.akx-shell')
        this.tabsRoot = root.querySelector('.akx-tabs')
        this.story = root.querySelector('.akx-story')
        this.salesRoot = root.querySelector('.akx-sales')
        this.stageLabel = root.querySelector('.akx-stage-label')
        this.indexLabel = root.querySelector('.akx-index')
        this.headline = root.querySelector('.akx-headline')
        this.detail = root.querySelector('.akx-detail')
        this.proof = root.querySelector('.akx-proof')
        this.cta = root.querySelector('.akx-cta')
        this.status = root.querySelector('.akx-status')
        this.playButton = root.querySelector('.akx-play')
        this.tabs = []

        SHOWCASE_PRODUCTS.forEach(function (product, index) {
          var tab = document.createElement('button')
          tab.type = 'button'
          tab.className = 'akx-tab'
          tab.id = 'akx-tab-' + product.id
          tab.setAttribute('role', 'tab')
          tab.setAttribute('aria-controls', 'akx-panel')
          var stage = document.createElement('span')
          stage.className = 'akx-tab-stage'
          stage.textContent = String(index + 1).padStart(2, '0') + ' / ' + product.stage

          var name = document.createElement('span')
          name.className = 'akx-tab-name'
          name.textContent = product.shortName
          if (product.id === this.currentProduct) {
            var dot = document.createElement('span')
            dot.className = 'akx-current-dot'
            dot.setAttribute('aria-label', 'Current site')
            name.appendChild(dot)
          }

          tab.appendChild(stage)
          tab.appendChild(name)
          tab.addEventListener('click', function () {
            this.manualPaused = true
            this.setActive(index, true)
            this.syncPlayback()
          }.bind(this))
          tab.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
            event.preventDefault()
            var next = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? SHOWCASE_PRODUCTS.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + SHOWCASE_PRODUCTS.length) % SHOWCASE_PRODUCTS.length
            this.manualPaused = true
            this.setActive(next, true)
            this.tabs[next].focus()
            this.syncPlayback()
          }.bind(this))
          this.tabsRoot.appendChild(tab)
          this.tabs.push(tab)
        }, this)

        this.playButton.addEventListener('click', function () {
          this.manualPaused = !this.manualPaused
          this.syncPlayback()
        }.bind(this))
        this.addEventListener('mouseenter', function () {
          this.transientPaused = true
          this.syncPlayback()
        }.bind(this))
        this.addEventListener('mouseleave', function () {
          this.transientPaused = false
          this.syncPlayback()
        }.bind(this))
        root.addEventListener('focusin', function () {
          this.transientPaused = true
          this.syncPlayback()
        }.bind(this))
        root.addEventListener('focusout', function (event) {
          if (root.contains(event.relatedTarget)) return
          this.transientPaused = false
          this.syncPlayback()
        }.bind(this))

        if (this.reducedMotion) this.shell.setAttribute('data-reduced', '')
        root.querySelector('.akx-content').id = 'akx-panel'
        this.setActive(this.activeIndex, false)
        this.syncPlayback()
      }

      disconnectedCallback() {
        window.clearInterval(this.timer)
      }

      setActive(index, userInitiated) {
        var product = SHOWCASE_PRODUCTS[index]
        if (!product) return
        this.activeIndex = index
        this.shell.style.setProperty('--akx-accent', product.accent)
        this.tabs.forEach(function (tab, tabIndex) {
          var selected = tabIndex === index
          tab.setAttribute('aria-selected', selected ? 'true' : 'false')
          tab.tabIndex = selected ? 0 : -1
        })
        this.stageLabel.textContent = String(index + 1).padStart(2, '0') + ' / ' + product.stage
        this.indexLabel.textContent = product.name
        this.headline.textContent = product.headline
        this.detail.textContent = product.detail
        this.proof.textContent = product.proof
        this.cta.href = product.href
        this.cta.textContent = product.cta + ' →'
        this.renderSales(product)
        var origin = SHOWCASE_PRODUCTS.find(function (item) { return item.id === this.currentProduct }.bind(this))
        this.status.textContent = product.id === this.currentProduct
          ? 'Current product · choose the next layer'
          : origin
            ? 'From ' + origin.shortName + ' to ' + product.shortName
            : 'Explore ' + product.shortName

        if (!this.reducedMotion && this.story.animate) {
          var animation = [
            { opacity: 0.35, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ]
          var timing = { duration: 300, easing: 'cubic-bezier(.25,1,.5,1)' }
          this.story.animate(animation, timing)
          this.salesRoot.animate(animation, timing)
        }

        if (userInitiated) {
          this.dispatchEvent(new CustomEvent('ak:ecosystem-select', {
            bubbles: true,
            composed: true,
            detail: { productId: product.id, href: product.href },
          }))
        }
      }

      renderSales(product) {
        var sales = product.sales
        this.salesRoot.textContent = ''

        var top = document.createElement('div')
        top.className = 'akx-sales-top'
        var headline = document.createElement('h4')
        headline.className = 'akx-sales-headline'
        headline.textContent = sales.headline
        top.appendChild(headline)
        this.salesRoot.appendChild(top)

        if (sales.command) {
          var command = document.createElement('div')
          command.className = 'akx-command'
          command.textContent = sales.command
          this.salesRoot.appendChild(command)
        }

        var demo = document.createElement('div')
        demo.className = 'akx-demo'
        demo.dataset.kind = sales.kind
        sales.steps.forEach(function (step, stepIndex) {
          var row = document.createElement('div')
          row.className = 'akx-demo-step'
          row.style.setProperty('--akx-step', String(stepIndex))
          var number = document.createElement('span')
          number.className = 'akx-demo-index'
          number.textContent = String(stepIndex + 1).padStart(2, '0')
          var text = document.createElement('span')
          text.className = 'akx-demo-text'
          text.textContent = step
          row.appendChild(number)
          row.appendChild(text)
          demo.appendChild(row)
        })
        this.salesRoot.appendChild(demo)
      }

      syncPlayback() {
        window.clearInterval(this.timer)
        this.timer = null
        if (this.reducedMotion) {
          this.playButton.hidden = true
          return
        }

        this.playButton.textContent = this.manualPaused ? 'Play tour' : 'Pause tour'
        this.playButton.setAttribute('aria-label', this.manualPaused ? 'Play tour of the ecosystem' : 'Pause tour of the ecosystem')
        if (this.manualPaused || this.transientPaused) return

        this.timer = window.setInterval(function () {
          this.setActive((this.activeIndex + 1) % SHOWCASE_PRODUCTS.length, false)
        }.bind(this), 5600)
      }
    }

    customElements.define('agentskit-ecosystem', AgentsKitEcosystem)
  }

  var FOOTER_CSS = `
    :host{display:block;position:relative;z-index:1;color:var(--ak-fg,#e6edf3);font-family:var(--ak-font-body,Inter,ui-sans-serif,system-ui,sans-serif)}
    *{box-sizing:border-box}
    .akf{position:relative;isolation:isolate}
    .akf::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(to bottom,transparent 0,color-mix(in srgb,var(--ak-bg,#0d1117) 58%,transparent) 120px);-webkit-backdrop-filter:blur(24px) saturate(130%);backdrop-filter:blur(24px) saturate(130%);-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 120px);mask-image:linear-gradient(to bottom,transparent 0,#000 120px)}
    .akf::after{content:"";position:absolute;top:0;left:50%;width:min(72rem,calc(100% - 32px));height:1px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--ak-border,#30363d) 80%,transparent) 20%,color-mix(in srgb,var(--ak-border,#30363d) 80%,transparent) 80%,transparent)}
    .akf-inner{max-width:72rem;margin:0 auto;padding:64px 24px 32px}
    .akf-grid{display:grid;gap:40px 32px;grid-template-columns:minmax(0,1.4fr) repeat(auto-fit,minmax(8.5rem,1fr))}
    .akf-brand{min-width:0}
    .akf-wordmark{display:inline-flex;align-items:baseline;gap:.35em;margin:0;color:var(--ak-fg,#e6edf3);font-family:var(--ak-font-display,"Space Grotesk",Inter,ui-sans-serif,system-ui,sans-serif);font-size:17px;font-weight:700;letter-spacing:-.02em;text-decoration:none}
    .akf-wordmark span+span{color:var(--ak-muted,#8b949e);font-weight:500}
    .akf-description{max-width:22rem;margin:16px 0 0;color:var(--ak-muted,#8b949e);font-size:14px;line-height:1.65}
    .akf-badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
    .akf-badge{display:inline-flex;min-height:32px;align-items:center;border-radius:8px;background:color-mix(in srgb,var(--ak-surface,#161b22) 70%,transparent);padding:0 12px;color:var(--ak-muted,#8b949e);font-family:var(--ak-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;text-decoration:none;transition:color 160ms ease}
    .akf-badge:hover{color:var(--ak-fg,#e6edf3)}
    .akf-col{min-width:0}
    .akf-title{margin:0 0 12px;color:var(--ak-muted,#8b949e);font-family:var(--ak-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase}
    ul{margin:0;padding:0;list-style:none}
    li+li{margin-top:10px}
    .akf-link{color:var(--ak-muted,#8b949e);font-size:14px;line-height:1.5;text-decoration:none;transition:color 160ms ease}
    .akf-link:hover{color:var(--ak-accent,#58a6ff)}
    .akf-link[aria-current="page"]{color:var(--ak-fg,#e6edf3);font-weight:600}
    a:focus-visible{outline:2px solid var(--ak-accent,#58a6ff);outline-offset:3px;border-radius:4px}
    .akf-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:48px;border-top:1px solid color-mix(in srgb,var(--ak-border,#30363d) 60%,transparent);padding-top:20px;color:var(--ak-muted,#8b949e);font-size:12px}
    .akf-bottom a{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--ak-border,#30363d) 90%,transparent);text-underline-offset:3px}
    ::slotted([slot="local"]){display:contents}
    @media(max-width:767px){.akf-inner{padding:48px 16px 28px}.akf-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 20px}.akf-brand{grid-column:1/-1}}
    @media(prefers-reduced-motion:reduce){.akf-link,.akf-badge{transition:none}}
  `

  // Attribute-supplied values reach href: only accept owner/repo slugs and http(s)/relative URLs.
  function safeRepo(value) {
    return typeof value === 'string' && /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(value) ? value : null
  }

  function safeHref(value) {
    try {
      var url = new URL(String(value), location.href)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '#'
    } catch (e) {
      return '#'
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }

  function footerLink(text, href, isCurrent) {
    var li = el('li')
    var a = el('a', 'akf-link', text)
    href = safeHref(href)
    a.href = href
    if (/^https?:/.test(href) && href.indexOf(location.origin) !== 0) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    }
    if (isCurrent) a.setAttribute('aria-current', 'page')
    li.appendChild(a)
    return li
  }

  function footerColumn(title, links, label) {
    var col = el(label ? 'nav' : 'div', 'akf-col')
    if (label) col.setAttribute('aria-label', label)
    col.appendChild(el('h2', 'akf-title', title))
    var list = el('ul')
    links.forEach(function (link) { list.appendChild(footerLink(link.text, link.href, link.current)) })
    col.appendChild(list)
    return col
  }

  function registerFooter() {
    if (!window.customElements || customElements.get('agentskit-footer')) return

    class AgentsKitFooter extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return
        var productId = this.getAttribute('current') || current
        var entry = CATALOG[productId] || CATALOG.agentskit || { name: 'AgentsKit', shortName: 'AgentsKit' }
        var repo = safeRepo(this.getAttribute('repo')) || safeRepo(repoFor(productId)) || safeRepo(currentRepoOverride) || 'AgentsKit-io/agentskit'
        var repoUrl = 'https://github.com/' + repo
        var license = this.getAttribute('license') || 'MIT License'
        var description = this.getAttribute('description') ||
          'Part of AgentsKit, the open-source TypeScript ecosystem for production AI agents.'

        var root = this.attachShadow({ mode: 'open' })
        var style = el('style')
        style.textContent = FOOTER_CSS
        root.appendChild(style)

        var footer = el('footer', 'akf')
        var inner = el('div', 'akf-inner')
        var grid = el('div', 'akf-grid')

        var brand = el('div', 'akf-brand')
        var wordmark = el('a', 'akf-wordmark')
        wordmark.href = '/'
        wordmark.appendChild(el('span', '', 'AgentsKit'))
        var productName = entry.shortName && entry.shortName !== 'AgentsKit' ? entry.shortName : ''
        if (productName) wordmark.appendChild(el('span', '', productName))
        brand.appendChild(wordmark)
        brand.appendChild(el('p', 'akf-description', description))
        var badges = el('div', 'akf-badges')
        var gh = el('a', 'akf-badge', 'GitHub')
        gh.href = repoUrl
        gh.target = '_blank'
        gh.rel = 'noopener noreferrer'
        badges.appendChild(gh)
        brand.appendChild(badges)
        grid.appendChild(brand)

        var local = el('slot')
        local.name = 'local'
        grid.appendChild(local)

        grid.appendChild(footerColumn('Ecosystem', PROPS.map(function (p) {
          return { text: p.label, href: p.url, current: p.id === productId }
        }), 'AgentsKit ecosystem'))
        grid.appendChild(footerColumn('Project', [
          { text: 'Source on GitHub', href: repoUrl },
          { text: 'Issues', href: repoUrl + '/issues' },
          { text: 'Contributing', href: repoUrl + '/blob/HEAD/CONTRIBUTING.md' },
          { text: license, href: repoUrl + '/blob/HEAD/LICENSE' },
        ]))

        inner.appendChild(grid)
        var bottom = el('div', 'akf-bottom')
        bottom.appendChild(el('span', '', '© ' + new Date().getFullYear() + ' AgentsKit contributors · ' + license))
        var home = el('a', '', 'agentskit.io')
        home.href = 'https://www.agentskit.io'
        var homeLine = el('span', '', 'One ecosystem, every product open source · ')
        homeLine.appendChild(home)
        bottom.appendChild(homeLine)
        inner.appendChild(bottom)
        footer.appendChild(inner)
        root.appendChild(footer)
      }
    }

    customElements.define('agentskit-footer', AgentsKitFooter)
  }

  var AURORA_CSS = `
    :host{position:fixed;inset:0;z-index:-1;display:block;overflow:hidden;pointer-events:none;contain:strict}
    .aka{position:absolute;inset:0;background:var(--ak-bg,#0d1117)}
    .aka[data-theme="light"]{background:var(--ak-bg,#ffffff)}
    .aka::before,.aka::after{content:"";position:absolute;inset:-22%;border-radius:50%;filter:blur(clamp(42px,7vw,96px));opacity:.68;will-change:transform}
    .aka::before{background:radial-gradient(ellipse 42% 34% at 24% 42%,color-mix(in srgb,var(--aka-accent,#2ea043) 34%,transparent),transparent 100%);animation:aka-first 16s ease-in-out infinite alternate}
    .aka::after{background:radial-gradient(ellipse 36% 28% at 68% 60%,color-mix(in srgb,var(--ak-blue,#58a6ff) 24%,transparent),transparent 100%);animation:aka-second 22s ease-in-out infinite alternate}
    .aka[data-shader="ready"]::before,.aka[data-shader="ready"]::after{opacity:0;animation:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.85}
    .aka[data-shader="fallback"] canvas,.aka[data-shader="static"] canvas{display:none}
    .aka[data-shader="static"]::before,.aka[data-shader="static"]::after{animation:none;will-change:auto}
    @keyframes aka-first{from{transform:translate3d(-3%,-2%,0) rotate(-8deg) scale(.98)}to{transform:translate3d(4%,3%,0) rotate(8deg) scale(1.06)}}
    @keyframes aka-second{from{transform:translate3d(3%,2%,0) rotate(7deg) scale(1.04)}to{transform:translate3d(-4%,-3%,0) rotate(-7deg) scale(.96)}}
    .aka-grid{position:absolute;inset:0;opacity:.4;background-image:linear-gradient(to right,color-mix(in srgb,var(--ak-fg,#e6edf3) 4%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--ak-fg,#e6edf3) 4%,transparent) 1px,transparent 1px);background-size:64px 64px;background-position:0 var(--aka-grid-y,0px);-webkit-mask-image:linear-gradient(to bottom,#000 0,#000 calc(var(--aka-grid-end,100vh) - 480px),transparent var(--aka-grid-end,100vh));mask-image:linear-gradient(to bottom,#000 0,#000 calc(var(--aka-grid-end,100vh) - 480px),transparent var(--aka-grid-end,100vh))}
    :host([grid="off"]) .aka-grid{display:none}
    @media(prefers-reduced-motion:reduce){.aka::before,.aka::after{animation:none}}
  `

  var AURORA_VERTEX = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}'
  var AURORA_FRAGMENT = [
    'precision mediump float;',
    'uniform vec2 u_resolution;uniform float u_time;uniform float u_light;uniform vec3 u_accent;uniform vec3 u_bg;',
    'void main(){',
    '  vec2 p=gl_FragCoord.xy/u_resolution.xy;p.x*=u_resolution.x/u_resolution.y;',
    '  float t=u_time*0.15;',
    '  float wave1=sin(p.x*2.0+t)*0.5+0.5;',
    '  float wave2=sin(p.y*3.0-t*1.5+wave1)*0.5+0.5;',
    '  float wave3=sin((p.x+p.y)*2.0+t+wave2*2.0)*0.5+0.5;',
    '  vec3 bg=u_bg;',
    '  vec3 auroraBlue=mix(vec3(0.345,0.651,1.0),vec3(0.035,0.412,0.855),u_light);',
    '  vec3 currentLayer=mix(auroraBlue,u_accent,wave1);',
    '  currentLayer=mix(currentLayer,auroraBlue,wave2*0.35*(1.0-u_light));',
    '  float mask=smoothstep(0.4,0.6,wave3);mask*=sin(p.y*3.14)*1.2;mask=clamp(mask,0.0,1.0);',
    '  vec3 finalColor=mix(bg,currentLayer,mask*mix(0.4,0.26,u_light));',
    '  vec3 ambientColor=mix(auroraBlue,u_accent,u_light);',
    '  finalColor+=ambientColor*smoothstep(0.7,1.0,wave2)*mix(0.2,0.04*mask,u_light);',
    '  gl_FragColor=vec4(finalColor,1.0);',
    '}',
  ].join('\n')

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type)
    if (!shader) throw new Error('aurora: cannot create shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader) || 'aurora: shader compile error'
      gl.deleteShader(shader)
      throw new Error(message)
    }
    return shader
  }

  function hexToRgb(value) {
    var hex = String(value || '').trim()
    if (/^#[0-9a-f]{3}$/i.test(hex)) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return null
    return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]
  }

  function colorToRgb(value) {
    var text = String(value || '').trim()
    var hex = hexToRgb(text)
    if (hex) return hex
    var match = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    return match ? [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255] : null
  }

  var SOFTWARE_RENDERER = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i

  function registerAurora() {
    if (!window.customElements || customElements.get('agentskit-aurora')) return

    class AgentsKitAurora extends HTMLElement {
      connectedCallback() {
        // Render aria-hidden="true" in server markup; setting it here would mutate framework-owned
        // attributes before hydration, so it is only added for consumers that omitted it.
        if (this.getAttribute('aria-hidden') !== 'true') {
          var element = this
          window.setTimeout(function () { element.setAttribute('aria-hidden', 'true') }, 0)
        }
        if (!this.shadowRoot) {
          var root = this.attachShadow({ mode: 'open' })
          root.innerHTML = '<style>' + AURORA_CSS + '</style><div class="aka" part="layer"><canvas></canvas></div><div class="aka-grid" part="grid"></div>'
        }
        this.start()
      }

      disconnectedCallback() {
        if (this.cleanup) this.cleanup()
        this.cleanup = null
      }

      readAccent() {
        var value = this.getAttribute('accent') || getComputedStyle(this).getPropertyValue('--ak-accent')
        return hexToRgb(value) ? String(value).trim() : '#2ea043'
      }

      start() {
        if (this.cleanup) return
        var layer = this.shadowRoot.querySelector('.aka')
        var canvas = this.shadowRoot.querySelector('canvas')
        var self = this
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
        var frame = 0
        var lastFrame = 0
        var startTime = performance.now()
        var gl = null
        var program = null
        var buffer = null
        var uniforms = {}

        var syncAccent = function () {
          var accent = self.readAccent()
          layer.style.setProperty('--aka-accent', accent)
          return hexToRgb(accent)
        }

        var draw = function (time) {
          if (!gl || !program) return
          gl.uniform1f(uniforms.time, time)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }

        var syncTheme = function () {
          // The page's own background decides the aurora's mode when it resolves to a colour,
          // so a site that is dark without a theme class never gets a light layer behind it.
          var bg = colorToRgb(getComputedStyle(self).getPropertyValue('--ak-bg'))
          var isDark = bg ? (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) < 0.5 : isDarkTheme()
          if (!bg) bg = isDark ? [0.051, 0.067, 0.090] : [1, 1, 1]
          layer.setAttribute('data-theme', isDark ? 'dark' : 'light')
          var rgb = syncAccent()
          if (gl) {
            gl.uniform1f(uniforms.light, isDark ? 0 : 1)
            gl.uniform3f(uniforms.bg, bg[0], bg[1], bg[2])
            if (rgb) gl.uniform3f(uniforms.accent, rgb[0], rgb[1], rgb[2])
            canvas.style.opacity = isDark ? '' : '0.9'
            draw((performance.now() - startTime) / 1000)
          }
        }

        // The loop runs at most 30 fps and only while it can be seen: it stops for hidden tabs,
        // when the layer is off screen, and for good under prefers-reduced-motion.
        var onScreen = true
        var render = function (now) {
          frame = window.requestAnimationFrame(render)
          if (now - lastFrame < 1000 / 30) return
          lastFrame = now
          draw((now - startTime) / 1000)
        }

        var syncMotion = function () {
          window.cancelAnimationFrame(frame)
          frame = 0
          if (gl && !reducedMotion.matches && onScreen && document.visibilityState === 'visible') {
            frame = window.requestAnimationFrame(render)
          }
        }
        var visibility = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
          onScreen = entries[entries.length - 1].isIntersecting
          syncMotion()
        }) : null

        var resize = function () {
          if (!gl) return
          // Half resolution at most: the shader is a soft gradient, so fewer pixels look the same.
          var scale = Math.min((window.devicePixelRatio || 1) * 0.5, 1)
          canvas.width = Math.max(1, Math.round(window.innerWidth * scale))
          canvas.height = Math.max(1, Math.round(window.innerHeight * scale))
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
          draw((performance.now() - startTime) / 1000)
        }

        // Losing a context we released on purpose (software renderer) must not restart the
        // animated CSS layer: only a live shader that dies falls back to the animated layer.
        var fallback = function () {
          if (layer.getAttribute('data-shader') !== 'static') layer.setAttribute('data-shader', 'fallback')
        }

        // The grid mesh scrolls with the page and fades out 480px before the document ends, like
        // the Playbook home, while the layer itself stays fixed behind content.
        var grid = this.shadowRoot.querySelector('.aka-grid')
        var gridQueued = false
        var docHeight = document.documentElement.scrollHeight
        var syncGrid = function () {
          gridQueued = false
          if (self.getAttribute('grid') === 'off') return
          var scrollY = window.scrollY || 0
          grid.style.setProperty('--aka-grid-y', (-(scrollY % 64)) + 'px')
          grid.style.setProperty('--aka-grid-end', Math.max(480, docHeight - scrollY) + 'px')
        }
        var queueGrid = function () {
          if (gridQueued) return
          gridQueued = true
          window.requestAnimationFrame(syncGrid)
        }
        // Layout is read only when the document resizes, never on scroll frames.
        var gridResize = window.ResizeObserver ? new ResizeObserver(function () {
          docHeight = document.documentElement.scrollHeight
          queueGrid()
        }) : null
        if (gridResize) gridResize.observe(document.documentElement)
        window.addEventListener('scroll', queueGrid, { passive: true })
        syncGrid()

        var initShader = function () {
          if (!self.isConnected || !self.cleanup) return
          try {
            // Software rasterisers (CI runners, VMs, GPU blocklists) would spend the main thread on
            // every frame; they get the CSS aurora instead.
            gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true })
            if (!gl) throw new Error('aurora: WebGL unavailable or software-rendered')
            var debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
            var renderer = String(gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '')
            if (SOFTWARE_RENDERER.test(renderer)) {
              var lose = gl.getExtension('WEBGL_lose_context')
              if (lose) lose.loseContext()
              throw new Error('aurora: software renderer ' + renderer)
            }
            var vertex = compileShader(gl, gl.VERTEX_SHADER, AURORA_VERTEX)
            var fragment = compileShader(gl, gl.FRAGMENT_SHADER, AURORA_FRAGMENT)
            program = gl.createProgram()
            gl.attachShader(program, vertex)
            gl.attachShader(program, fragment)
            gl.linkProgram(program)
            gl.deleteShader(vertex)
            gl.deleteShader(fragment)
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'aurora: link error')
            gl.useProgram(program)
            uniforms = {
              time: gl.getUniformLocation(program, 'u_time'),
              light: gl.getUniformLocation(program, 'u_light'),
              accent: gl.getUniformLocation(program, 'u_accent'),
              bg: gl.getUniformLocation(program, 'u_bg'),
              resolution: gl.getUniformLocation(program, 'u_resolution'),
            }
            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
            var position = gl.getAttribLocation(program, 'position')
            gl.enableVertexAttribArray(position)
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
            resize()
            layer.setAttribute('data-shader', 'ready')
          } catch (error) {
            // Without a hardware GPU the CSS layer holds still too: animating large blurred
            // layers costs the same software compositor the shader would have.
            gl = null
            layer.setAttribute('data-shader', 'static')
          }
          syncTheme()
          syncMotion()
        }

        // Shader compilation and the first frames stay off the critical path: the CSS aurora
        // renders immediately and the WebGL layer takes over once the page is idle after load.
        var idleHandle = 0
        var scheduleShader = function () {
          idleHandle = window.requestIdleCallback
            ? window.requestIdleCallback(initShader, { timeout: 3000 })
            : window.setTimeout(initShader, 1200)
        }
        if (document.readyState === 'complete') scheduleShader()
        else window.addEventListener('load', scheduleShader, { once: true })

        syncTheme()
        if (visibility) visibility.observe(this)
        document.addEventListener('visibilitychange', syncMotion)
        var themeObserver = new MutationObserver(syncTheme)
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
        window.addEventListener('resize', resize, { passive: true })
        canvas.addEventListener('webglcontextlost', fallback)
        window.addEventListener('ak:surface-change', syncTheme)
        if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotion)
        if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme)

        this.cleanup = function () {
          window.removeEventListener('load', scheduleShader)
          if (window.cancelIdleCallback) window.cancelIdleCallback(idleHandle)
          window.clearTimeout(idleHandle)
          themeObserver.disconnect()
          if (visibility) visibility.disconnect()
          document.removeEventListener('visibilitychange', syncMotion)
          window.removeEventListener('ak:surface-change', syncTheme)
          window.removeEventListener('scroll', queueGrid)
          if (gridResize) gridResize.disconnect()
          window.removeEventListener('resize', resize)
          canvas.removeEventListener('webglcontextlost', fallback)
          if (reducedMotion.removeEventListener) reducedMotion.removeEventListener('change', syncMotion)
          if (darkQuery && darkQuery.removeEventListener) darkQuery.removeEventListener('change', syncTheme)
          window.cancelAnimationFrame(frame)
          if (gl && buffer) gl.deleteBuffer(buffer)
          if (gl && program) gl.deleteProgram(program)
        }
      }
    }

    customElements.define('agentskit-aurora', AgentsKitAurora)
  }

  // Only the bar is on the critical path. The tour, footer, and aurora upgrade when the main
  // thread is idle; until then their server-rendered fallbacks (and v1.css) stand in.
  function whenIdle(task) {
    if (window.requestIdleCallback) window.requestIdleCallback(task, { timeout: 2000 })
    else window.setTimeout(task, 300)
  }
  whenIdle(function () {
    registerFooter()
    registerEcosystemShowcase()
    registerAurora()
  })

  function build() {
    if (document.getElementById('ak-eco')) return
    var style = document.createElement('style')
    style.id = 'ak-eco-style'
    style.textContent = css
    document.head.appendChild(style)

    var bar = document.createElement('nav')
    bar.id = 'ak-eco'
    bar.setAttribute('aria-label', 'AgentsKit ecosystem')

    var brand = document.createElement('a')
    brand.className = 'ak-eco-brand'
    brand.href = 'https://www.agentskit.io'
    brand.setAttribute('aria-label', 'AgentsKit')
    brand.title = 'AgentsKit'
    brand.innerHTML = BRAND_ICON
    bar.appendChild(brand)

    var products = document.createElement('div')
    products.className = 'ak-eco-products'
    PROPS.forEach(function (p) {
      var a = document.createElement('a')
      a.className = 'ak-eco-link'
      a.href = p.url
      a.textContent = p.label
      if (p.id === current) a.setAttribute('aria-current', 'page')
      products.appendChild(a)
    })
    bar.appendChild(products)

    var spacer = document.createElement('span')
    spacer.className = 'ak-eco-spacer'
    bar.appendChild(spacer)

    // The star belongs to the product the visitor is on: starring AgentsKit from the Harness site is a vote
    // nobody meant to cast. Products outside the bar (Playbook) still resolve through the catalog; unknown
    // products fall back to the organisation.
    var currentRepo = safeRepo(currentRepoOverride) || safeRepo(repoFor(current))
    var starUrl = currentRepo
      ? 'https://github.com/' + currentRepo
      : 'https://github.com/AgentsKit-io'

    var community = [
      { label: 'Star on GitHub', icon: GH_ICON, url: starUrl },
      // Discord kept for restore — hidden via CSS (data-ak-eco-discord).
      { label: 'Discord', icon: DISCORD_ICON, url: 'https://discord.gg/zx6z2p4jVb', discord: true },
    ]
    community.forEach(function (c) {
      var a = document.createElement('a')
      a.className = 'ak-eco-link ak-eco-cta'
      a.href = c.url
      a.target = '_blank'
      a.rel = 'noopener'
      a.setAttribute('aria-label', c.label)
      if (c.discord) a.setAttribute('data-ak-eco-discord', '')
      else a.setAttribute('data-ak-eco-star', '')
      a.innerHTML = c.icon + '<span>' + c.label + '</span>'
      bar.appendChild(a)
    })

    document.body.insertBefore(bar, document.body.firstChild)
  }

  loadFonts()

  if (!window.__akShellSurface) {
    window.__akShellSurface = true
    if (document.body) watchSurface()
    else document.addEventListener('DOMContentLoaded', watchSurface)
  }

  if (!barAlreadyInjected) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', build)
    } else {
      build()
    }
  }
})()
