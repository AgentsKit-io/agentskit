'use client'

// Inline SVG widgets — zero deps, brand-token aware.

export function WeatherCard() {
  const days = [
    { d: 'Sat', t: 72, icon: 'sun' as const },
    { d: 'Sun', t: 68, icon: 'cloud' as const },
    { d: 'Mon', t: 64, icon: 'rain' as const },
    { d: 'Tue', t: 66, icon: 'rain' as const },
    { d: 'Wed', t: 70, icon: 'sun' as const },
  ]
  return (
    <div className="overflow-hidden rounded-lg border border-ak-border bg-gradient-to-br from-[#1e3a8a] via-[#4338ca] to-[#7c3aed] p-4 text-ak-foam shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-ak-foam/70">Tokyo · Sat Apr 18</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold">72°</span>
            <span className="text-sm text-ak-foam/80">feels 70°</span>
          </div>
        </div>
        <SunIcon />
      </div>
      <div className="mb-3 flex justify-start gap-2">
        {days.map(d => (
          <div key={d.d} className="flex flex-col items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs">
            <span className="text-ak-foam/70">{d.d}</span>
            {d.icon === 'sun' ? <SunIcon small /> : d.icon === 'cloud' ? <CloudIcon /> : <RainIcon />}
            <span className="font-semibold">{d.t}°</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        <span className="rounded-full bg-white/10 px-2 py-0.5">humidity 54%</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">wind 8mph</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">UV 6</span>
      </div>
    </div>
  )
}

export function PriceCard() {
  const pts = [32, 28, 30, 27, 33, 38, 36, 41, 39, 44, 48, 46, 52, 55, 53, 58, 62, 60, 65, 67]
  const max = Math.max(...pts)
  const min = Math.min(...pts)
  const w = 280
  const h = 60
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w
      const y = h - ((p - min) / (max - min)) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7931a] font-bold text-ak-foam">
            ₿
          </div>
          <div>
            <div className="font-semibold text-ak-foam">Bitcoin</div>
            <div className="font-mono text-xs text-ak-graphite">BTC/USD</div>
          </div>
        </div>
        <span className="rounded-full bg-ak-green/10 px-2 py-0.5 font-mono text-xs text-ak-green">
          +2.4%
        </span>
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-ak-foam">$67,432</span>
        <span className="font-mono text-xs text-ak-graphite">24h</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mb-2 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="btc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EA043" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2EA043" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#btc-fill)" />
        <path d={path} fill="none" stroke="#2EA043" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <div>
          <div className="text-ak-graphite">24h high</div>
          <div className="text-ak-foam">$68,120</div>
        </div>
        <div>
          <div className="text-ak-graphite">24h low</div>
          <div className="text-ak-foam">$65,840</div>
        </div>
        <div>
          <div className="text-ak-graphite">vol</div>
          <div className="text-ak-foam">$28.4B</div>
        </div>
      </div>
    </div>
  )
}

export function OrderTracker() {
  const steps = ['placed', 'packed', 'shipped', 'delivered']
  const current = 2
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-ak-graphite">Order #4521</div>
          <div className="font-semibold text-ak-foam">Arriving Tue, Apr 21</div>
        </div>
        <span className="rounded-full bg-ak-blue/10 px-2 py-0.5 font-mono text-xs text-ak-blue">
          in transit
        </span>
      </div>
      <div className="relative mb-3 flex justify-between">
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-ak-border" />
        <div
          className="absolute top-3 left-3 h-0.5 bg-ak-blue transition-all"
          style={{ width: `${(current / (steps.length - 1)) * 100 - 6}%` }}
        />
        {steps.map((s, i) => {
          const done = i <= current
          const pulse = i === current
          return (
            <div key={s} className="relative flex flex-col items-center gap-2" style={{ zIndex: 1 }}>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 font-mono text-[10px] ${
                  done
                    ? 'border-ak-blue bg-ak-blue text-ak-midnight'
                    : 'border-ak-border bg-ak-midnight text-ak-graphite'
                } ${pulse ? 'ring-2 ring-ak-blue/40' : ''}`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`font-mono text-[10px] ${done ? 'text-ak-foam' : 'text-ak-graphite'}`}>
                {s}
              </span>
            </div>
          )
        })}
      </div>
      <div className="rounded border border-ak-border bg-ak-surface p-2 font-mono text-xs text-ak-graphite">
        <span className="text-ak-green">◉</span> last update: left distribution center · 2h ago
      </div>
    </div>
  )
}

export function FlightList() {
  const flights = [
    { airline: 'Delta', dep: '06:15', arr: '14:45', dur: '5h 30m', stops: 'nonstop', price: 289 },
    { airline: 'JetBlue', dep: '09:40', arr: '18:05', dur: '5h 25m', stops: 'nonstop', price: 312 },
    { airline: 'United', dep: '13:20', arr: '23:55', dur: '7h 35m', stops: '1 stop · DEN', price: 248 },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="font-mono text-xs text-ak-graphite">LAX → JFK · Apr 18</div>
        <span className="font-mono text-xs text-ak-graphite">3 results</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {flights.map(f => (
          <div
            key={f.airline}
            className="group flex items-center gap-3 rounded-md border border-ak-border bg-ak-surface p-2.5 transition hover:border-ak-blue"
          >
            <div className="w-14 font-mono text-xs font-semibold text-ak-foam">{f.airline}</div>
            <div className="flex flex-1 items-center gap-2 font-mono text-sm text-ak-foam">
              <span>{f.dep}</span>
              <div className="flex flex-1 items-center gap-1 text-ak-graphite">
                <span className="h-px flex-1 bg-ak-border" />
                <span className="text-[10px]">{f.dur}</span>
                <span className="h-px flex-1 bg-ak-border" />
              </div>
              <span>{f.arr}</span>
            </div>
            <div className="w-20 text-right">
              <div className="font-semibold text-ak-foam">${f.price}</div>
              <div className="font-mono text-[10px] text-ak-graphite">{f.stops}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RAGCite() {
  const chunks = [
    { id: '§2', title: 'GTM expansion', score: 0.92, snippet: 'Target enterprise verticals in Q3...' },
    { id: '§4', title: 'Pricing rework', score: 0.88, snippet: 'Tiered model, usage-based add-ons...' },
    { id: '§7', title: 'Onboarding cuts', score: 0.81, snippet: 'Reduce time-to-first-value to 5min...' },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">strategy-q3.pdf · 24 pages</div>
        <span className="rounded-full bg-ak-blue/10 px-2 py-0.5 font-mono text-xs text-ak-blue">3 chunks</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {chunks.map(c => (
          <div key={c.id} className="rounded-md border border-ak-border bg-ak-surface p-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-ak-blue/15 px-1.5 py-0.5 font-mono text-[10px] text-ak-blue">{c.id}</span>
                <span className="text-xs font-semibold text-ak-foam">{c.title}</span>
              </div>
              <span className="font-mono text-[10px] text-ak-green">{c.score}</span>
            </div>
            <div className="font-mono text-[11px] text-ak-graphite">{c.snippet}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-ak-graphite">
        embeddings: openai/text-3-small · store: lancedb
      </div>
    </div>
  )
}

export function SandboxRun() {
  return (
    <div className="overflow-hidden rounded-lg border border-ak-border bg-ak-midnight shadow-lg">
      <div className="flex items-center justify-between border-b border-ak-border bg-ak-surface px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-ak-green" />
          <span className="text-ak-foam">e2b · python 3.11</span>
        </div>
        <span className="font-mono text-xs text-ak-graphite">142ms · 18MB</span>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-ak-foam">
        <span className="text-ak-graphite"># sandbox.py</span>{'\n'}
        <span className="text-ak-blue">def</span> <span className="text-ak-green">fib</span>(n):{'\n'}
        {'  '}<span className="text-ak-blue">if</span> n {'<'} 2: <span className="text-ak-blue">return</span> n{'\n'}
        {'  '}<span className="text-ak-blue">return</span> fib(n-1) + fib(n-2){'\n'}
        {'\n'}
        <span className="text-ak-graphite">{'>>>'}</span> fib(20){'\n'}
        <span className="text-ak-green">6765</span>
      </pre>
      <div className="border-t border-ak-border bg-ak-surface px-3 py-1.5 font-mono text-[10px] text-ak-graphite">
        ◉ isolated · no network · cpu 12% · stdout captured
      </div>
    </div>
  )
}

export function MultiAgent() {
  const nodes = [
    { id: 'planner', x: 10, label: 'planner', color: 'blue' },
    { id: 'research', x: 35, label: 'researcher', color: 'green' },
    { id: 'writer', x: 60, label: 'writer', color: 'blue' },
    { id: 'critic', x: 85, label: 'critic', color: 'amber' },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">runtime.graph · 4 agents</div>
        <span className="rounded-full bg-ak-green/10 px-2 py-0.5 font-mono text-xs text-ak-green">running</span>
      </div>
      <svg viewBox="0 0 100 36" className="mb-2 w-full" preserveAspectRatio="none">
        <line x1="14" y1="18" x2="35" y2="18" stroke="#30363d" strokeWidth="0.4" />
        <line x1="39" y1="18" x2="60" y2="18" stroke="#30363d" strokeWidth="0.4" />
        <line x1="64" y1="18" x2="85" y2="18" stroke="#30363d" strokeWidth="0.4" />
        {nodes.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy="18" r="4" fill={n.color === 'green' ? '#2EA043' : n.color === 'amber' ? '#f0b429' : '#388BFD'} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-ak-foam">
        {nodes.map(n => (
          <span key={n.id}>{n.label}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1 font-mono text-[11px]">
        <div className="text-ak-green">✓ planner: 3 subtasks emitted</div>
        <div className="text-ak-green">✓ researcher: 12 sources gathered</div>
        <div className="text-ak-blue">◉ writer: drafting…</div>
        <div className="text-ak-graphite">○ critic: queued</div>
      </div>
    </div>
  )
}

export function ObsTrace() {
  const spans = [
    { label: 'agent.run', ms: 1400, w: 100, color: 'blue', off: 0 },
    { label: '  llm.call (anthropic)', ms: 980, w: 70, color: 'green', off: 4 },
    { label: '  tool.search', ms: 320, w: 23, color: 'amber', off: 74 },
    { label: '  llm.synthesize', ms: 95, w: 7, color: 'green', off: 92 },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">trace tr_8a2f</div>
        <div className="flex gap-3 font-mono text-xs">
          <span className="text-ak-foam">1.4s</span>
          <span className="text-ak-graphite">2.1k tok</span>
          <span className="text-ak-green">$0.004</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {spans.map(s => (
          <div key={s.label} className="font-mono text-[10px]">
            <div className="mb-0.5 flex justify-between text-ak-graphite">
              <span className="text-ak-foam">{s.label}</span>
              <span>{s.ms}ms</span>
            </div>
            <div className="relative h-2 rounded bg-ak-surface">
              <div
                className={`absolute top-0 h-2 rounded ${
                  s.color === 'green' ? 'bg-ak-green' : s.color === 'amber' ? 'bg-[#f0b429]' : 'bg-ak-blue'
                }`}
                style={{ left: `${s.off}%`, width: `${s.w}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 font-mono text-[10px] text-ak-graphite">
        export: langsmith · otel · console
      </div>
    </div>
  )
}

export function MemoryRecall() {
  const facts = [
    { k: 'diet', v: 'vegan', age: '3w' },
    { k: 'allergies', v: 'gluten', age: '3w' },
    { k: 'cuisine', v: 'mediterranean, indian', age: '5d' },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">memory · sqlite + vector</div>
        <span className="rounded-full bg-ak-green/10 px-2 py-0.5 font-mono text-xs text-ak-green">3 hits</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {facts.map(f => (
          <div
            key={f.k}
            className="flex items-center justify-between rounded-md border border-ak-blue/30 bg-ak-blue/5 px-2.5 py-1.5"
          >
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-ak-blue">●</span>
              <span className="text-ak-graphite">{f.k}:</span>
              <span className="text-ak-foam">{f.v}</span>
            </div>
            <span className="font-mono text-[10px] text-ak-graphite">{f.age} ago</span>
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-ak-graphite">
        recalled across sessions · no re-prompt needed
      </div>
    </div>
  )
}

export function ProviderSwap() {
  const rows = [
    { name: 'anthropic / sonnet', latency: 412, cost: 0.0042, quality: 92, active: true },
    { name: 'openai / gpt-4o', latency: 380, cost: 0.0051, quality: 90, active: false },
    { name: 'google / gemini-2', latency: 445, cost: 0.0038, quality: 87, active: false },
    { name: 'ollama / llama3', latency: 1240, cost: 0, quality: 78, active: false },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">adapters · fanout</div>
        <span className="rounded-full bg-ak-blue/10 px-2 py-0.5 font-mono text-xs text-ak-blue">4 results</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(r => (
          <div
            key={r.name}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${
              r.active ? 'border-ak-blue bg-ak-blue/5' : 'border-ak-border bg-ak-surface'
            }`}
          >
            <span className="flex-1 text-ak-foam">{r.name}</span>
            <span className="w-14 text-right text-ak-graphite">{r.latency}ms</span>
            <span className="w-16 text-right text-ak-green">${r.cost.toFixed(4)}</span>
            <span className={`w-10 text-right ${r.quality >= 90 ? 'text-ak-green' : 'text-ak-graphite'}`}>
              {r.quality}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-ak-graphite">
        same controller · swap providers anytime
      </div>
    </div>
  )
}

export function IntegrationCard() {
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4a154b] font-bold text-ak-foam">
            #
          </div>
          <div>
            <div className="text-sm font-semibold text-ak-foam">slack · #product</div>
            <div className="font-mono text-[10px] text-ak-graphite">posted 2s ago</div>
          </div>
        </div>
        <span className="rounded-full bg-ak-green/10 px-2 py-0.5 font-mono text-xs text-ak-green">sent</span>
      </div>
      <div className="rounded-md border border-ak-border bg-ak-surface p-3">
        <div className="mb-1 font-mono text-xs text-ak-foam">launch update — agentskit v0.3</div>
        <div className="font-mono text-[11px] text-ak-graphite">
          ships today: tools, runtime, observability. blog post pinned in #announcements.
        </div>
        <div className="mt-2 flex gap-2 font-mono text-[10px] text-ak-graphite">
          <span className="rounded-full bg-ak-blue/10 px-2 py-0.5">🚀 1</span>
          <span className="rounded-full bg-ak-blue/10 px-2 py-0.5">👀 0</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2 font-mono text-[10px] text-ak-graphite">
        <span>+ resend</span>
        <span>+ telegram</span>
        <span>+ github</span>
        <span>+ calendar</span>
      </div>
    </div>
  )
}

export function TerminalMirror() {
  return (
    <div className="overflow-hidden rounded-lg border border-ak-border bg-black shadow-lg">
      <div className="flex items-center justify-between border-b border-ak-border bg-ak-surface px-3 py-1.5">
        <div className="font-mono text-xs text-ak-foam">~/agentskit · ink · tty</div>
        <span className="font-mono text-[10px] text-ak-green">● connected</span>
      </div>
      <div className="px-3 py-2 font-mono text-[11px] leading-relaxed">
        <div>
          <span className="text-[#89b4fa]">›</span>{' '}
          <span className="text-[#cdd6f4]">weather in tokyo this weekend</span>
        </div>
        <div>
          <span className="text-[#fab387]">⏺</span>{' '}
          <span className="text-[#bac2de]">weather.get</span>
          <span className="text-[#a6e3a1]">(...) </span>
          <span className="text-[#a6adc8]">600ms</span>
        </div>
        <div className="my-1.5 rounded-md border border-[#45475a] text-[#cdd6f4]">
          <div className="flex items-center justify-between border-b border-[#45475a] px-2 py-1">
            <span>Tokyo · Sat Apr 18</span>
            <span className="text-[#f9e2af]">☀ 72° · feels 70°</span>
          </div>
          <div className="grid grid-cols-5 gap-x-2 px-2 py-1 text-center">
            {[
              ['Sat', '72°'],
              ['Sun', '68°'],
              ['Mon', '64°'],
              ['Tue', '66°'],
              ['Wed', '70°'],
            ].map(([day, temp]) => (
              <div key={day}>
                <div className="text-[#a6adc8]">{day}</div>
                <div>{temp}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[#a6e3a1]">▎ Sunny saturday, showers sun → mon.</div>
      </div>
      <div className="border-t border-ak-border bg-ak-surface px-3 py-1.5 font-mono text-[10px] text-ak-graphite">
        same controller as browser · @agentskit/ink
      </div>
    </div>
  )
}

export function EvalRun() {
  const tests = [
    { name: 'tool-call accuracy', pass: 12, total: 12 },
    { name: 'memory recall', pass: 8, total: 8 },
    { name: 'rag citation', pass: 4, total: 5 },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">eval.regression · n=25</div>
        <div className="flex gap-3 font-mono text-xs">
          <span className="text-ak-green">24/25</span>
          <span className="text-ak-graphite">p95 1.2s</span>
          <span className="text-ak-green">$0.04</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {tests.map(t => {
          const pct = (t.pass / t.total) * 100
          const ok = t.pass === t.total
          return (
            <div key={t.name}>
              <div className="mb-0.5 flex justify-between font-mono text-[11px]">
                <span className="text-ak-foam">{t.name}</span>
                <span className={ok ? 'text-ak-green' : 'text-[#f0b429]'}>
                  {t.pass}/{t.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-ak-surface">
                <div
                  className={`h-full transition-all ${ok ? 'bg-ak-green' : 'bg-[#f0b429]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 rounded border border-ak-green/30 bg-ak-green/5 p-2 font-mono text-[11px] text-ak-green">
        ✓ ci gate passed · diff vs main: +2 tests, 0 regressions
      </div>
    </div>
  )
}

export function SkillSwap() {
  const skills = [
    { name: 'researcher', active: false },
    { name: 'critic', active: true },
    { name: 'planner', active: false },
    { name: 'coder', active: false },
    { name: 'summarizer', active: false },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs text-ak-graphite">skills · system prompt + persona</div>
        <span className="rounded-full bg-ak-blue/10 px-2 py-0.5 font-mono text-xs text-ak-blue">switched</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {skills.map(s => (
          <span
            key={s.name}
            className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
              s.active
                ? 'border-ak-blue bg-ak-blue/15 text-ak-blue'
                : 'border-ak-border bg-ak-surface text-ak-graphite'
            }`}
          >
            {s.name}
          </span>
        ))}
      </div>
      <div className="rounded-md border border-ak-border bg-ak-surface p-2.5">
        <div className="mb-1 font-mono text-[10px] text-ak-graphite">critic.systemPrompt</div>
        <div className="font-mono text-[11px] text-ak-foam">
          You are a senior editor. Cut weak verbs. Surface buried ledes. Be direct.
        </div>
      </div>
      <div className="mt-2 font-mono text-[10px] text-ak-graphite">
        hot-swap mid-conversation · stack multiple skills
      </div>
    </div>
  )
}

function SunIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 36
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="#fbbf24" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <line
          key={a}
          x1="12"
          y1="3"
          x2="12"
          y2="5.5"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#e2e8f0">
      <path d="M18 15h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-5Z" />
    </svg>
  )
}

function RainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 12h-1.26A8 8 0 1 0 9 17h9a5 5 0 0 0 0-5Z" fill="#94a3b8" />
      <line x1="8" y1="19" x2="7" y2="22" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="11" y2="22" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="19" x2="15" y2="22" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
