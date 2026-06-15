/**
 * AgentsKit ecosystem bar — one shared top nav across the four properties.
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
    { id: 'agentskit', label: 'AgentsKit', host: 'www.agentskit.io', url: 'https://www.agentskit.io' },
    { id: 'registry', label: 'Registry', host: 'registry.agentskit.io', url: 'https://registry.agentskit.io' },
    { id: 'akos', label: 'AKOS', host: 'akos.agentskit.io', url: 'https://akos.agentskit.io' },
    { id: 'playbook', label: 'Playbook', host: 'playbook.agentskit.io', url: 'https://playbook.agentskit.io' },
  ]
  // ecobar:props-end

  var host = location.hostname
  // Match agentskit.io only as the registrable domain suffix (not a substring,
  // so evil-agentskit.io.attacker.test does not match).
  var isAgentskit = host === 'agentskit.io' || /\.agentskit\.io$/.test(host)
  var current =
    (document.currentScript && document.currentScript.getAttribute('data-current')) ||
    (PROPS.filter(function (p) { return host === p.host })[0] || {}).id ||
    (isAgentskit ? host.split('.')[0] : '') ||
    ''

  var css =
    '#ak-eco{position:relative;z-index:30;display:flex;gap:4px;align-items:center;' +
    'font:500 13px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:8px 16px;' +
    'background:#0b0b0f;color:#e7e7ea;border-bottom:1px solid #23232b}' +
    '#ak-eco .ak-eco-brand{font-weight:700;letter-spacing:-.01em;margin-right:8px;color:#fff;text-decoration:none}' +
    '#ak-eco a.ak-eco-link{color:#a9a9b3;text-decoration:none;padding:5px 10px;border-radius:7px}' +
    '#ak-eco a.ak-eco-link:hover{color:#fff;background:#1c1c24}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#fff;background:#2a2a35}' +
    '#ak-eco .ak-eco-spacer{flex:1}' +
    '#ak-eco a.ak-eco-cta{display:inline-flex;align-items:center;gap:6px}' +
    '#ak-eco a.ak-eco-cta svg{width:14px;height:14px;fill:currentColor}' +
    '@media(prefers-color-scheme:light){#ak-eco{background:#fff;color:#0b0b0f;border-bottom-color:#e6e6ea}' +
    '#ak-eco .ak-eco-brand{color:#0b0b0f}#ak-eco a.ak-eco-link{color:#555}' +
    '#ak-eco a.ak-eco-link:hover{color:#000;background:#f1f1f4}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#000;background:#ececf1}}'

  // Community links — pinned to the right of the bar (after the spacer). Project
  // surfaces only: no personal-brand links. Icons are inline SVG (zero deps).
  var GH_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>'
  var DISCORD_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.55 3.01A13.2 13.2 0 0 0 10.3 2l-.16.33c1.1.27 1.6.66 2.13 1.13a7.5 7.5 0 0 0-2.6-.83 9.6 9.6 0 0 0-3.34 0 7.5 7.5 0 0 0-2.6.83c.53-.47 1.13-.9 2.13-1.13L5.7 2c-1.16.2-2.26.55-3.25 1.01C.6 6.05.13 9 .36 11.92a13.3 13.3 0 0 0 3.97 2c.32-.43.6-.9.84-1.38-.46-.17-.9-.39-1.32-.65l.32-.24c2.55 1.18 5.3 1.18 7.82 0l.33.24c-.42.26-.86.48-1.32.65.24.48.52.94.84 1.38a13.2 13.2 0 0 0 3.98-2c.27-3.38-.47-6.3-2.07-8.91zM5.5 10.16c-.78 0-1.42-.71-1.42-1.59 0-.87.63-1.59 1.42-1.59.79 0 1.43.72 1.42 1.59 0 .88-.63 1.59-1.42 1.59zm5.01 0c-.78 0-1.42-.71-1.42-1.59 0-.87.63-1.59 1.42-1.59.79 0 1.43.72 1.42 1.59 0 .88-.63 1.59-1.42 1.59z"/></svg>'

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
    brand.textContent = 'AgentsKit'
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
      { label: 'Discord', icon: DISCORD_ICON, url: 'https://discord.gg/zx6z2p4jVb' },
    ]
    community.forEach(function (c) {
      var a = document.createElement('a')
      a.className = 'ak-eco-link ak-eco-cta'
      a.href = c.url
      a.target = '_blank'
      a.rel = 'noopener'
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
