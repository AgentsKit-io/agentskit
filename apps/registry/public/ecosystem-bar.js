/**
 * AgentsKit ecosystem bar — shared discovery for the public family.
 * Embed on any site with: <script src="https://www.agentskit.io/ecosystem-bar.js" defer></script>
 *
 * Self-contained, zero deps. Detects the current property by hostname and
 * highlights it. Update this one file to update the bar everywhere.
 */
(function () {
  if (window.__akEcosystemBar) return
  window.__akEcosystemBar = true

  // ecobar:props-start — GENERATED from ecosystem.json by scripts/sync-ecosystem.mjs. Do not edit by hand.
  var PROPS = [
    { id: "agentskit", label: "AgentsKit", host: "www.agentskit.io", url: "https://www.agentskit.io", repo: "AgentsKit-io/agentskit" },
    { id: "registry", label: "Registry", host: "registry.agentskit.io", url: "https://registry.agentskit.io", repo: "AgentsKit-io/agentskit-registry" },
    { id: "agentskit-chat", label: "Chat", host: "chat.agentskit.io", url: "https://chat.agentskit.io", repo: "AgentsKit-io/agentskit-chat" },
    { id: "doc-bridge", label: "Doc Bridge", host: "doc-bridge.agentskit.io", url: "https://doc-bridge.agentskit.io/", repo: "AgentsKit-io/doc-bridge" },
    { id: "code-review", label: "Code Review", host: "github.com", url: "https://github.com/AgentsKit-io/code-review", repo: "AgentsKit-io/code-review" },
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
      "href": "https://github.com/AgentsKit-io/code-review#readme",
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

  var script = document.currentScript
  var currentRepoOverride = script && script.dataset.currentRepo
  var host = location.hostname
  // Match agentskit.io only as the registrable domain suffix (not a substring,
  // so evil-agentskit.io.attacker.test does not match).
  var isAgentskit = host === 'agentskit.io' || /\.agentskit\.io$/.test(host)
  var current =
    (script && script.getAttribute('data-current')) ||
    (PROPS.filter(function (p) { return host === p.host })[0] || {}).id ||
    (isAgentskit ? host.split('.')[0] : '') ||
    ''

  var css =
    '#ak-eco{position:relative;z-index:30;display:flex;gap:4px;align-items:center;' +
    'font:500 13px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:8px 16px;' +
    'background:rgba(11,15,20,.96);color:#e7e7ea;border-bottom:1px solid rgba(48,63,78,.72)}' +
    'body:has(.ak-home-layout) #ak-eco{background:rgba(11,15,20,.66);' +
    '-webkit-backdrop-filter:blur(20px) saturate(125%);backdrop-filter:blur(20px) saturate(125%)}' +
    '#ak-eco .ak-eco-brand{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;' +
    'min-height:44px;margin-right:8px;color:#fff;text-decoration:none;line-height:0}' +
    '#ak-eco .ak-eco-brand svg{width:18px;height:16px;display:block}' +
    '#ak-eco a.ak-eco-link{box-sizing:border-box;display:inline-flex;flex:0 0 auto;align-items:center;min-height:44px;color:#a9a9b3;text-decoration:none;padding:5px 10px;border-radius:7px;white-space:nowrap}' +
    '#ak-eco a.ak-eco-link:hover{color:#fff;background:#1c1c24}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#fff;background:#2a2a35}' +
    '#ak-eco .ak-eco-products{display:flex;gap:4px;align-items:center;min-width:0}' +
    '#ak-eco .ak-eco-spacer{flex:1}' +
    '#ak-eco a.ak-eco-cta{display:inline-flex;align-items:center;gap:6px}' +
    '#ak-eco a.ak-eco-cta svg{width:14px;height:14px;fill:currentColor}' +
    // Discord is kept in the DOM for an easy restore; hidden until community is ready.
    '#ak-eco a.ak-eco-cta[data-ak-eco-discord]{display:none}' +
    '@media(max-width:767px){#ak-eco{box-sizing:border-box;width:100%;max-width:100vw;overflow:hidden}' +
    '#ak-eco .ak-eco-products{flex:1;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}' +
    '#ak-eco .ak-eco-products::-webkit-scrollbar{display:none}' +
    '#ak-eco .ak-eco-spacer{display:none}' +
    '#ak-eco a.ak-eco-cta:not([data-ak-eco-discord]){justify-content:center;width:36px;min-width:36px;padding:5px}' +
    '#ak-eco a.ak-eco-cta:not([data-ak-eco-discord]) span{display:none}}'

  var SHOWCASE_CSS = `
    :host{display:block;color-scheme:dark;--akx-accent:#2ea043;--akx-bg:#0b0f14;--akx-surface:#11171e;--akx-line:#27313a;--akx-fg:#e7edf4;--akx-muted:#8b98a6;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
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
    @media(prefers-reduced-motion:reduce){.akx-demo-step{opacity:1;transform:none;animation:none}.akx-cta,.akx-tab{transition:none}}
    :host([data-visual="agentskit-home"]) .akx-shell{--akx-accent:var(--ak-graphite,#8b949e)!important;border:0}
    :host([data-visual="agentskit-home"]) .akx-frame{background:color-mix(in srgb,var(--ak-bg,#0d1117) 62%,transparent);backdrop-filter:blur(22px);box-shadow:0 18px 60px rgba(0,0,0,.12)}
    :host([data-visual="agentskit-home"]) .akx-tab{--akx-accent:var(--ak-graphite,#8b949e)!important;border-right:0}
    :host([data-visual="agentskit-home"]) .akx-tab:hover,:host([data-visual="agentskit-home"]) .akx-tab[aria-selected="true"]{background:rgba(255,255,255,.035)}
    :host([data-visual="agentskit-home"]) .akx-story{border-color:color-mix(in srgb,var(--ak-border,#30363d) 65%,transparent)}
    :host([data-visual="agentskit-home"]) .akx-demo{border-color:color-mix(in srgb,var(--ak-border,#30363d) 65%,transparent)}
    :host([data-visual="agentskit-home"]) .akx-demo-step{background:rgba(255,255,255,.025)}
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
        this.status.textContent = product.id === this.currentProduct
          ? 'Current product · choose the next layer'
          : 'From ' + (SHOWCASE_PRODUCTS.find(function (item) { return item.id === this.currentProduct }.bind(this)) || SHOWCASE_PRODUCTS[0]).shortName + ' to ' + product.shortName

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
        this.playButton.setAttribute('aria-label', this.manualPaused ? 'Play ecosystem tour' : 'Pause ecosystem tour')
        if (this.manualPaused || this.transientPaused) return

        this.timer = window.setInterval(function () {
          this.setActive((this.activeIndex + 1) % SHOWCASE_PRODUCTS.length, false)
        }.bind(this), 5600)
      }
    }

    customElements.define('agentskit-ecosystem', AgentsKitEcosystem)
  }

  registerEcosystemShowcase()

  function build() {
    var style = document.createElement('style')
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
    // nobody meant to cast. Without a public repository for the current product, the organisation stands in.
    var currentProp = PROPS.filter(function (p) { return p.id === current })[0]
    var currentRepo = currentRepoOverride || (currentProp && currentProp.repo)
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
      a.innerHTML = c.icon + '<span>' + c.label + '</span>'
      bar.appendChild(a)
    })

    document.body.insertBefore(bar, document.body.firstChild)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build)
  } else {
    build()
  }
})()
