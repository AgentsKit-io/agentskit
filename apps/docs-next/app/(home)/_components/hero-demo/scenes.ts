export type WidgetKind = 'weather' | 'price' | 'order' | 'flight'

export type Event =
  | { type: 'userType'; text: string; cps?: number }
  | { type: 'userSend' }
  | { type: 'thinking' }
  | { type: 'tool'; label: string; ms: number }
  | { type: 'widget'; kind: WidgetKind }
  | { type: 'assistantStream'; text: string; cps?: number }
  | { type: 'pause'; ms: number }

export type Scene = {
  id: WidgetKind
  label: string
  events: Event[]
}

export const SCENES: Scene[] = [
  {
    id: 'weather',
    label: 'weather',
    events: [
      { type: 'userType', text: 'weather in Tokyo this weekend?' },
      { type: 'userSend' },
      { type: 'pause', ms: 200 },
      { type: 'thinking' },
      { type: 'tool', label: 'weather.get({ city: "Tokyo", days: 5 })', ms: 600 },
      { type: 'widget', kind: 'weather' },
      {
        type: 'assistantStream',
        text: 'Sunny Saturday, showers Sunday → Monday. Pack a light jacket.',
      },
      { type: 'pause', ms: 2400 },
    ],
  },
  {
    id: 'price',
    label: 'crypto',
    events: [
      { type: 'userType', text: 'whats the price of bitcoin right now?' },
      { type: 'userSend' },
      { type: 'pause', ms: 200 },
      { type: 'thinking' },
      { type: 'tool', label: 'crypto.price("BTC") + chart24h()', ms: 700 },
      { type: 'widget', kind: 'price' },
      {
        type: 'assistantStream',
        text: 'BTC up 2.4% in the last 24h. Volume solid at $28B.',
      },
      { type: 'pause', ms: 2400 },
    ],
  },
  {
    id: 'order',
    label: 'orders',
    events: [
      { type: 'userType', text: 'track my order #4521' },
      { type: 'userSend' },
      { type: 'pause', ms: 200 },
      { type: 'thinking' },
      { type: 'tool', label: 'orders.track({ id: "4521" })', ms: 500 },
      { type: 'widget', kind: 'order' },
      {
        type: 'assistantStream',
        text: 'Shipped and en route. Expected Tuesday, Apr 21.',
      },
      { type: 'pause', ms: 2400 },
    ],
  },
  {
    id: 'flight',
    label: 'flights',
    events: [
      { type: 'userType', text: 'flights LAX to NYC tomorrow' },
      { type: 'userSend' },
      { type: 'pause', ms: 200 },
      { type: 'thinking' },
      { type: 'tool', label: 'flights.search({ from: "LAX", to: "JFK" })', ms: 800 },
      { type: 'widget', kind: 'flight' },
      {
        type: 'assistantStream',
        text: 'Three options under $320. Delta 06:15 is your fastest nonstop.',
      },
      { type: 'pause', ms: 2600 },
    ],
  },
]
