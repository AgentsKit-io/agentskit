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

  var PROPS = [
    { id: 'framework', label: 'Framework', host: 'www.agentskit.io', url: 'https://www.agentskit.io' },
    { id: 'playbook', label: 'Playbook', host: 'playbook.agentskit.io', url: 'https://playbook.agentskit.io' },
    { id: 'registry', label: 'Registry', host: 'registry.agentskit.io', url: 'https://registry.agentskit.io' },
    { id: 'akos', label: 'AKOS', host: 'akos.agentskit.io', url: 'https://akos.agentskit.io' },
  ]

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
    '#ak-eco{position:sticky;top:0;z-index:2147483000;display:flex;gap:4px;align-items:center;' +
    'font:500 13px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:8px 16px;' +
    'background:#0b0b0f;color:#e7e7ea;border-bottom:1px solid #23232b}' +
    '#ak-eco .ak-eco-brand{font-weight:700;letter-spacing:-.01em;margin-right:8px;color:#fff;text-decoration:none}' +
    '#ak-eco a.ak-eco-link{color:#a9a9b3;text-decoration:none;padding:5px 10px;border-radius:7px}' +
    '#ak-eco a.ak-eco-link:hover{color:#fff;background:#1c1c24}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#fff;background:#2a2a35}' +
    '#ak-eco .ak-eco-spacer{flex:1}' +
    '@media(prefers-color-scheme:light){#ak-eco{background:#fff;color:#0b0b0f;border-bottom-color:#e6e6ea}' +
    '#ak-eco .ak-eco-brand{color:#0b0b0f}#ak-eco a.ak-eco-link{color:#555}' +
    '#ak-eco a.ak-eco-link:hover{color:#000;background:#f1f1f4}' +
    '#ak-eco a.ak-eco-link[aria-current="page"]{color:#000;background:#ececf1}}'

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

    document.body.insertBefore(bar, document.body.firstChild)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build)
  } else {
    build()
  }
})()
