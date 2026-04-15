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
    <div className="overflow-hidden rounded-lg border border-ak-border bg-gradient-to-br from-[#1e3a8a] via-[#4338ca] to-[#7c3aed] p-4 text-white shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-white/70">Tokyo · Sat Apr 18</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold">72°</span>
            <span className="text-sm text-white/80">feels 70°</span>
          </div>
        </div>
        <SunIcon />
      </div>
      <div className="mb-3 flex justify-between gap-2">
        {days.map(d => (
          <div key={d.d} className="flex flex-col items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs">
            <span className="text-white/70">{d.d}</span>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7931a] font-bold text-white">
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
