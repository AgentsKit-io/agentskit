/**
 * AgentsKit ecosystem bar — one shared top nav across the seven products.
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
    { id: "agentskit", label: "AgentsKit", host: "www.agentskit.io", url: "https://www.agentskit.io" },
    { id: "registry", label: "Registry", host: "registry.agentskit.io", url: "https://registry.agentskit.io" },
    { id: "agentskit-chat", label: "Chat", host: "chat.agentskit.io", url: "https://chat.agentskit.io" },
    { id: "playbook", label: "Playbook", host: "playbook.agentskit.io", url: "https://playbook.agentskit.io" },
    { id: "doc-bridge", label: "Doc Bridge", host: "doc-bridge.agentskit.io", url: "https://doc-bridge.agentskit.io/" },
    { id: "akos", label: "AKOS", host: "akos.agentskit.io", url: "https://akos.agentskit.io" },
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
      "stage": "Build",
      "headline": "One foundation. Every layer stays yours.",
      "detail": "Compose runtime, adapters, tools, memory, RAG, and UI without glue code or lock-in.",
      "proof": "22 packages · <10 KB core",
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
      "stage": "Discover",
      "headline": "Shadcn-like agents. Installed as source.",
      "detail": "Find a working agent, copy its source into your project, and change every line.",
      "proof": "Ready-made · source-owned",
      "sales": {
        "kind": "registry-install",
        "headline": "300+ ready-to-use agents.",
        "metric": "300+",
        "metricLabel": "shadcn-like agents",
        "capabilities": [
          "Research",
          "Support",
          "Coding",
          "Data",
          "Marketing",
          "18+ more categories"
        ],
        "steps": [
          "Find the right agent",
          "Run npx agentskit add",
          "Own every line"
        ],
        "command": "npx agentskit add research"
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
      "detail": "Define the experience once and deliver it across web, desktop, CLI, and mobile.",
      "proof": "Web · Desktop · CLI · Mobile",
      "sales": {
        "kind": "human-agent",
        "headline": "Human ↔ agent. Without losing control.",
        "metric": "4",
        "metricLabel": "surfaces · one conversation",
        "logos": [
          {
            "id": "web",
            "label": "Web"
          },
          {
            "id": "desktop",
            "label": "Desktop"
          },
          {
            "id": "cli",
            "label": "CLI"
          },
          {
            "id": "mobile",
            "label": "Mobile"
          }
        ],
        "capabilities": [
          "Streaming",
          "Approvals",
          "Tool results",
          "Shared state"
        ],
        "steps": [
          "Agent requests a protected action",
          "Human approves",
          "The conversation continues everywhere"
        ]
      },
      "cta": "Explore AgentsKit Chat"
    },
    {
      "id": "playbook",
      "name": "Agents Playbook",
      "shortName": "Playbook",
      "accent": "#8B5CF6",
      "href": "https://playbook.agentskit.io/docs",
      "stage": "Standardize",
      "headline": "Engineering standards agents can execute.",
      "detail": "Turn repeatable practices into guidance that coding agents can follow in every repository.",
      "proof": "Convention → executable guidance",
      "sales": {
        "kind": "standards-flow",
        "headline": "Your standards. Every agent. Every repository.",
        "metric": "1×",
        "metricLabel": "define · reuse everywhere",
        "logos": [
          {
            "id": "architecture",
            "label": "Architecture"
          },
          {
            "id": "tests",
            "label": "Tests"
          },
          {
            "id": "security",
            "label": "Security"
          },
          {
            "id": "style",
            "label": "Style"
          }
        ],
        "capabilities": [
          "Repository rules",
          "Review criteria",
          "Agent guidance",
          "Team conventions"
        ],
        "steps": [
          "Define the standard once",
          "Agents receive executable guidance",
          "Review consistent output"
        ]
      },
      "cta": "Explore the Playbook"
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
      "id": "akos",
      "name": "AgentsKit OS",
      "shortName": "AKOS",
      "accent": "#34D399",
      "href": "https://akos.agentskit.io/docs",
      "stage": "Operate",
      "headline": "Run and govern agents in production.",
      "detail": "Add orchestration, governance, and operational control when your system needs it.",
      "proof": "Orchestration · governance · control",
      "sales": {
        "kind": "enterprise-control",
        "headline": "The enterprise control plane for agents.",
        "metric": "Enterprise",
        "metricLabel": "operations and governance",
        "logos": [
          {
            "id": "logs",
            "label": "Logs"
          },
          {
            "id": "approvals",
            "label": "Approvals"
          },
          {
            "id": "rbac",
            "label": "RBAC"
          },
          {
            "id": "policies",
            "label": "Policies"
          }
        ],
        "capabilities": [
          "Logs",
          "Approvals",
          "RBAC",
          "Policies",
          "Tracing",
          "Costs"
        ],
        "steps": [
          "Agent requests a protected action",
          "RBAC and policy gates evaluate",
          "Human approves; logs and trace persist"
        ]
      },
      "cta": "Explore AgentsKit OS"
    }
  ]
  // ecobar:showcase-end

  var host = location.hostname
  // Match agentskit.io only as the registrable domain suffix (not a substring,
  // so evil-agentskit.io.attacker.test does not match).
  var isAgentskit = host === 'agentskit.io' || /\.agentskit\.io$/.test(host)
  var current =
    (document.currentScript && document.currentScript.getAttribute('data-current')) ||
    (PROPS.filter(function (p) { return host === p.host })[0] || {}).id ||
    (isAgentskit ? host.split('.')[0] : '') ||
    ''

  var INLINE_ICONS = {
    anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
    googlegemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
    mistralai: 'M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z',
    slack: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
    github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
    notion: 'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z',
    web: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.92 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.06 8.06 0 0 1 18.92 8zM12 4c.83 1.2 1.5 2.54 1.91 4h-3.82A13.7 13.7 0 0 1 12 4zM4.26 14A7.8 7.8 0 0 1 4 12c0-.69.1-1.36.26-2h3.38a16.5 16.5 0 0 0 0 4H4.26zm.82 2h2.95a15.7 15.7 0 0 0 1.38 3.56A8.06 8.06 0 0 1 5.08 16zM8.03 8H5.08a8.06 8.06 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.03 8zM12 20a13.7 13.7 0 0 1-1.91-4h3.82A13.7 13.7 0 0 1 12 20zm2.35-6h-4.7a14.7 14.7 0 0 1 0-4h4.7a14.7 14.7 0 0 1 0 4zm.24 5.56A15.7 15.7 0 0 0 15.97 16h2.95a8.06 8.06 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
    desktop: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z',
    cli: 'M4 17l6-5-6-5v3l3 2-3 2v3zm7 0h9v-2h-9v2z',
    mobile: 'M17 1H7C5.9 1 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z',
    architecture: 'M12 2 2 7l10 5 10-5-10-5zm0 12L2 9v3l10 5 10-5V9l-10 5zm0 5L2 14v3l10 5 10-5v-3l-10 5z',
    tests: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    security: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18L19 6.3V11c0 4.52-2.98 8.69-7 9.93C7.98 19.69 5 15.52 5 11V6.3l7-3.12z',
    style: 'M8.7 16.6 4.1 12l4.6-4.6L7.3 6l-6 6 6 6 1.4-1.4zm6.6 0 4.6-4.6-4.6-4.6L16.7 6l6 6-6 6-1.4-1.4z',
    human: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    markdown: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm1 7V3.5L18.5 9H15zM8 13h8v2H8v-2zm0 4h8v2H8v-2z',
    code: 'M8.7 16.6 4.1 12l4.6-4.6L7.3 6l-6 6 6 6 1.4-1.4zm6.6 0 4.6-4.6-4.6-4.6L16.7 6l6 6-6 6-1.4-1.4z',
    agent: 'M20 9V7h-2V4H6v3H4v2H2v11h20V9h-2zm-9-4h2v2h-2V5zm9 13H4v-7h16v7zm-9-5H7v3h4v-3zm6 0h-4v3h4v-3z',
    logs: 'M3 9h2V7H3v2zm0 4h2v-2H3v2zm0 4h2v-2H3v2zM7 7v2h14V7H7zm0 6h14v-2H7v2zm0 4h14v-2H7v2z',
    approvals: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    rbac: 'M12.65 10A6 6 0 1 0 12.65 14H17v4h4v-4h2v-4H12.65zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
    policies: 'M19 3h-4.18A3 3 0 0 0 9.18 3H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 16-4-4 1.41-1.41L10 16.17l6.59-6.59L18 11l-8 8z',
  }

  var css =
    '#ak-eco{position:relative;z-index:30;display:flex;gap:4px;align-items:center;' +
    'font:500 13px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:8px 16px;' +
    'background:#0b0b0f;color:#e7e7ea;border-bottom:1px solid #23232b}' +
    '#ak-eco .ak-eco-brand{display:inline-flex;align-items:center;justify-content:center;' +
    'margin-right:8px;color:#fff;text-decoration:none;line-height:0}' +
    '#ak-eco .ak-eco-brand svg{width:18px;height:16px;display:block}' +
    '#ak-eco a.ak-eco-link{color:#a9a9b3;text-decoration:none;padding:5px 10px;border-radius:7px}' +
    '#ak-eco a.ak-eco-link:hover{color:#fff;background:#1c1c24}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#fff;background:#2a2a35}' +
    '#ak-eco .ak-eco-spacer{flex:1}' +
    '#ak-eco a.ak-eco-cta{display:inline-flex;align-items:center;gap:6px}' +
    '#ak-eco a.ak-eco-cta svg{width:14px;height:14px;fill:currentColor}' +
    // Discord is kept in the DOM for an easy restore; hidden until community is ready.
    '#ak-eco a.ak-eco-cta[data-ak-eco-discord]{display:none}' +
    '@media(max-width:767px){#ak-eco{box-sizing:border-box;width:100%;max-width:100vw;overflow-x:auto;' +
    'overscroll-behavior-x:contain;scrollbar-width:none}#ak-eco::-webkit-scrollbar{display:none}' +
    '#ak-eco .ak-eco-brand{position:sticky;left:0;z-index:1;background:inherit}' +
    '#ak-eco .ak-eco-spacer,#ak-eco a.ak-eco-cta{display:none}}' +
    '@media(prefers-color-scheme:light){#ak-eco{background:#fff;color:#0b0b0f;border-bottom-color:#e6e6ea}' +
    '#ak-eco .ak-eco-brand{color:#0b0b0f}#ak-eco a.ak-eco-link{color:#555}' +
    '#ak-eco a.ak-eco-link:hover{color:#000;background:#f1f1f4}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#000;background:#ececf1}}'

  var SHOWCASE_CSS = `
    :host{display:block;color-scheme:dark;--akx-accent:#2ea043;--akx-bg:#0b0f14;--akx-surface:#11171e;--akx-line:#27313a;--akx-fg:#e7edf4;--akx-muted:#8b98a6;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    button,a{font:inherit}
    .akx-shell{overflow:hidden;background:var(--akx-bg);color:var(--akx-fg);border-block:1px solid var(--akx-line)}
    .akx-inner{max-width:1152px;margin:0 auto;padding:80px 24px}
    .akx-intro{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(18rem,.8fr);align-items:end;gap:48px;padding-bottom:40px}
    .akx-eyebrow,.akx-stage-label,.akx-index,.akx-proof,.akx-metric-label{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-transform:uppercase;letter-spacing:.17em}
    .akx-eyebrow{margin:0 0 14px;color:var(--akx-muted);font-size:11px}
    .akx-title{max-width:720px;margin:0;font-size:clamp(2.1rem,5vw,4rem);line-height:1.02;letter-spacing:-.045em}
    .akx-intro-copy{max-width:520px;margin:0;color:var(--akx-muted);font-size:16px;line-height:1.7}
    .akx-frame{border:1px solid var(--akx-line)}
    .akx-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));overflow-x:auto;border-bottom:1px solid var(--akx-line);scrollbar-width:none}
    .akx-tabs::-webkit-scrollbar{display:none}
    .akx-tab{position:relative;min-height:72px;border:0;border-right:1px solid var(--akx-line);background:transparent;color:var(--akx-muted);cursor:pointer;padding:12px;text-align:left;transition:color 180ms cubic-bezier(.25,1,.5,1),background 180ms cubic-bezier(.25,1,.5,1)}
    .akx-tab:last-child{border-right:0}
    .akx-tab:hover{color:var(--akx-fg);background:#11171e}
    .akx-tab:focus-visible{outline:2px solid var(--akx-accent);outline-offset:-3px}
    .akx-tab[aria-selected="true"]{color:var(--akx-fg);background:#11171e;box-shadow:inset 0 -2px 0 var(--akx-accent)}
    .akx-tab-stage{display:block;margin-bottom:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--akx-accent)}
    .akx-tab-name{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:650;white-space:nowrap}
    .akx-current-dot{width:5px;height:5px;border-radius:50%;background:var(--akx-accent)}
    .akx-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:410px}
    .akx-story{display:flex;flex-direction:column;padding:48px;border-right:1px solid var(--akx-line)}
    .akx-story-top{display:flex;align-items:center;justify-content:space-between;gap:20px}
    .akx-stage-label,.akx-index{margin:0;font-size:10px;color:var(--akx-muted)}
    .akx-stage-label{color:var(--akx-accent)}
    .akx-headline{max-width:610px;margin:48px 0 0;font-size:clamp(2rem,4vw,3.5rem);line-height:1.03;letter-spacing:-.04em}
    .akx-detail{max-width:560px;margin:20px 0 0;color:var(--akx-muted);font-size:16px;line-height:1.65}
    .akx-story-bottom{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-top:auto;padding-top:48px}
    .akx-proof{margin:0;color:var(--akx-fg);font-size:10px;line-height:1.6}
    .akx-cta{display:inline-flex;min-height:44px;align-items:center;color:var(--akx-accent);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;text-decoration:none;white-space:nowrap;transition:color 180ms cubic-bezier(.25,1,.5,1),transform 180ms cubic-bezier(.25,1,.5,1)}
    .akx-cta:hover{color:var(--akx-fg);transform:translateX(3px)}
    .akx-cta:focus-visible{outline:2px solid var(--akx-accent);outline-offset:4px}
    .akx-sales{display:flex;min-width:0;flex-direction:column;padding:40px;background:#0e141a}
    .akx-sales-top{display:flex;align-items:start;justify-content:space-between;gap:24px}
    .akx-sales-headline{max-width:330px;margin:0;font-size:clamp(1.35rem,2.4vw,2rem);line-height:1.08;letter-spacing:-.03em}
    .akx-metrics{display:flex;flex-shrink:0;align-items:flex-start;justify-content:flex-end;gap:18px}
    .akx-metric{flex-shrink:0;text-align:right}
    .akx-metric-value{display:block;color:var(--akx-accent);font-size:clamp(1.8rem,3vw,2.7rem);font-weight:750;line-height:1;letter-spacing:-.04em}
    .akx-metric-label{display:block;max-width:140px;margin-top:7px;color:var(--akx-muted);font-size:8px;line-height:1.45}
    .akx-logos{display:flex;gap:8px;margin-top:26px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
    .akx-logos[data-kind="human-agent"],.akx-logos[data-kind="standards-flow"],.akx-logos[data-kind="knowledge-bridge"],.akx-logos[data-kind="enterprise-control"]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible}
    .akx-logos::-webkit-scrollbar{display:none}
    .akx-logo{display:inline-flex;min-height:40px;flex:0 0 auto;align-items:center;gap:8px;border:1px solid var(--akx-line);background:var(--akx-surface);padding:7px 10px;color:var(--akx-muted);font-size:11px}
    .akx-logos[data-kind="human-agent"] .akx-logo,.akx-logos[data-kind="standards-flow"] .akx-logo,.akx-logos[data-kind="knowledge-bridge"] .akx-logo,.akx-logos[data-kind="enterprise-control"] .akx-logo{min-width:0;justify-content:center;padding-inline:7px}
    .akx-logo-mark{position:relative;display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;color:var(--akx-fg);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;font-weight:750}
    .akx-logo-mark svg{display:block;width:18px;height:18px;fill:currentColor}
    .akx-demo{position:relative;display:flex;flex:1;flex-direction:column;justify-content:center;gap:8px;margin-top:24px;border-block:1px solid var(--akx-line);padding:18px 0}
    .akx-demo-step{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:46px;padding:8px 10px;background:var(--akx-surface);opacity:0;transform:translateY(5px);animation:akx-step-in 340ms cubic-bezier(.25,1,.5,1) forwards;animation-delay:calc(var(--akx-step) * 70ms)}
    .akx-demo-index{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;color:var(--akx-accent);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;letter-spacing:.06em}
    .akx-demo-text{font-size:12px;font-weight:600;line-height:1.4}
    .akx-demo-state{color:var(--akx-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em}
    .akx-demo-step::before{content:"";position:absolute;left:21px;top:100%;height:8px;border-left:1px solid var(--akx-accent);opacity:.5}
    .akx-demo-step:last-child::before{display:none}
    .akx-demo[data-kind="enterprise-control"] .akx-demo-step:nth-child(2){border-color:var(--akx-accent);box-shadow:inset 2px 0 0 var(--akx-accent)}
    .akx-command{display:flex;align-items:center;gap:10px;border:1px solid var(--akx-line);background:#090d11;padding:11px 13px;color:var(--akx-fg);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;overflow-wrap:anywhere}
    .akx-command::before{content:"$";color:var(--akx-accent)}
    .akx-capabilities{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:18px}
    .akx-capabilities[data-count="6"]{grid-template-columns:repeat(3,minmax(0,1fr))}
    .akx-capability{display:flex;min-width:0;min-height:34px;align-items:center;justify-content:center;border:1px solid var(--akx-line);padding:6px 8px;color:var(--akx-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:9px;line-height:1.35;text-align:center;text-transform:uppercase;letter-spacing:.06em}
    @keyframes akx-step-in{to{opacity:1;transform:translateY(0)}}
    .akx-controls{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--akx-line);padding:12px 16px;color:var(--akx-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:.08em}
    .akx-play{min-height:44px;border:0;background:transparent;color:var(--akx-muted);cursor:pointer;padding:0 8px;text-transform:uppercase;letter-spacing:.12em}
    .akx-play:hover{color:var(--akx-fg)}
    .akx-play:focus-visible{outline:2px solid var(--akx-accent);outline-offset:2px}
    @media(max-width:820px){.akx-inner{padding:64px 20px}.akx-intro{grid-template-columns:1fr;gap:20px}.akx-tabs{grid-template-columns:repeat(6,minmax(128px,1fr))}.akx-content{grid-template-columns:1fr}.akx-story{min-height:410px;border-right:0;border-bottom:1px solid var(--akx-line);padding:36px}.akx-sales{min-height:520px;padding:36px}.akx-headline{margin-top:38px}}
    @media(max-width:540px){.akx-inner{padding:52px 16px}.akx-intro{padding-bottom:32px}.akx-story{min-height:430px;padding:28px}.akx-story-bottom{align-items:flex-start;flex-direction:column}.akx-sales{min-height:560px;padding:28px}.akx-sales-top{flex-direction:column}.akx-metrics{width:100%;justify-content:flex-start}.akx-metric{text-align:left}.akx-demo-step{grid-template-columns:26px minmax(0,1fr)}.akx-demo-state{display:none}.akx-capabilities,.akx-capabilities[data-count="6"]{grid-template-columns:repeat(2,minmax(0,1fr))}.akx-controls span{display:none}}
    @media(prefers-reduced-motion:reduce){.akx-demo-step{opacity:1;transform:none;animation:none}.akx-cta,.akx-tab{transition:none}}
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
          tab.style.setProperty('--akx-accent', product.accent)

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
        var pitch = document.createElement('div')
        var headline = document.createElement('h4')
        headline.className = 'akx-sales-headline'
        headline.textContent = sales.headline
        pitch.appendChild(headline)

        var metrics = document.createElement('div')
        metrics.className = 'akx-metrics'
        var metricItems = sales.metrics || [{ value: sales.metric, label: sales.metricLabel }]
        metricItems.forEach(function (metricItem) {
          var metric = document.createElement('div')
          metric.className = 'akx-metric'
          var metricValue = document.createElement('span')
          metricValue.className = 'akx-metric-value'
          metricValue.textContent = metricItem.value
          var metricLabel = document.createElement('span')
          metricLabel.className = 'akx-metric-label'
          metricLabel.textContent = metricItem.label
          metric.appendChild(metricValue)
          metric.appendChild(metricLabel)
          metrics.appendChild(metric)
        })
        top.appendChild(pitch)
        top.appendChild(metrics)
        this.salesRoot.appendChild(top)

        if (sales.logos && sales.logos.length) {
          var logos = document.createElement('div')
          logos.className = 'akx-logos'
          logos.dataset.kind = sales.kind
          logos.setAttribute('aria-label', 'Recognizable capabilities and integrations')
          sales.logos.forEach(function (logo) {
          var item = document.createElement('span')
          item.className = 'akx-logo'
          var mark = document.createElement('span')
          mark.className = 'akx-logo-mark'
          mark.setAttribute('aria-hidden', 'true')
          mark.textContent = logo.glyph || logo.label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()

          if (!logo.glyph && INLINE_ICONS[logo.id]) {
            mark.textContent = ''
            var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            icon.setAttribute('viewBox', '0 0 24 24')
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('d', INLINE_ICONS[logo.id])
            icon.appendChild(path)
            mark.appendChild(icon)
          }

          var logoLabel = document.createElement('span')
          logoLabel.textContent = logo.label
          item.appendChild(mark)
          item.appendChild(logoLabel)
            logos.appendChild(item)
          })
          this.salesRoot.appendChild(logos)
        }

        if (sales.command) {
          var command = document.createElement('div')
          command.className = 'akx-command'
          command.textContent = sales.command
          this.salesRoot.appendChild(command)
        }

        var stateLabels = {
          'integration-stack': ['adapter', 'compose', 'ship'],
          'registry-install': ['discover', 'install', 'own'],
          'human-agent': ['agent', 'human', 'system'],
          'standards-flow': ['define', 'distribute', 'verify'],
          'knowledge-bridge': ['human → agent', 'bridge', 'agent → human'],
          'enterprise-control': ['request', 'policy', 'recorded'],
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
          var state = document.createElement('span')
          state.className = 'akx-demo-state'
          state.textContent = stateLabels[sales.kind][stepIndex]
          row.appendChild(number)
          row.appendChild(text)
          row.appendChild(state)
          demo.appendChild(row)
        })
        this.salesRoot.appendChild(demo)

        var capabilities = document.createElement('div')
        capabilities.className = 'akx-capabilities'
        capabilities.dataset.count = String(sales.capabilities.length)
        sales.capabilities.forEach(function (capability) {
          var item = document.createElement('span')
          item.className = 'akx-capability'
          item.textContent = capability
          capabilities.appendChild(item)
        })
        this.salesRoot.appendChild(capabilities)
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

    PROPS.forEach(function (p) {
      var a = document.createElement('a')
      a.className = 'ak-eco-link'
      a.href = p.url
      a.textContent = p.label
      if (p.id === current) a.setAttribute('aria-current', 'page')
      bar.appendChild(a)
    })

    var spacer = document.createElement('span')
    spacer.className = 'ak-eco-spacer'
    bar.appendChild(spacer)

    var community = [
      { label: 'Star on GitHub', icon: GH_ICON, url: 'https://github.com/AgentsKit-io/agentskit' },
      // Discord kept for restore — hidden via CSS (data-ak-eco-discord).
      { label: 'Discord', icon: DISCORD_ICON, url: 'https://discord.gg/zx6z2p4jVb', discord: true },
    ]
    community.forEach(function (c) {
      var a = document.createElement('a')
      a.className = 'ak-eco-link ak-eco-cta'
      a.href = c.url
      a.target = '_blank'
      a.rel = 'noopener'
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
