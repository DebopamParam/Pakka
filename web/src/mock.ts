import { courierNames, demoOrder, updateText } from './model'
import type { NewOrder, OpsEvent, OpsState, Order, Reply, Voice } from './model'

const now = () => new Date().toISOString()
const initialRouting = {
  by_prefix: { '30': 'dakexpress', '56': 'swiftship', '58': 'swiftship' },
  fallback: 'dakexpress',
}
const sample = {
  ...demoOrder,
  status: 'awaiting_confirm',
  courier: 'swiftship',
  needs_voice_confirm: true,
  prepaid_nudge: 'rs50_off',
  reason: 'First-time COD · high RTO',
  created_at: now(),
} satisfies Omit<Order, 'id'>

let current: OpsState = {
  simulated: true,
  routing: initialRouting,
  incidents: [],
  couriers: [
    { id: 'swiftship', name: 'SwiftShip', hub: 'Bengaluru hub', status: 'ok', p95_ms: 124, error_rate: 0.006, simulated: true },
    { id: 'dakexpress', name: 'DakExpress', hub: 'Backup courier', status: 'ok', p95_ms: 158, error_rate: 0.003, simulated: true },
  ],
  orders: [
    { ...sample, id: 'PK-1043' },
    { id: 'PK-1042', buyer_name: 'Rohan Rao', city: 'Bengaluru', pincode: '560034', value: 2199, cod: false, status: 'in_transit', courier: 'swiftship', needs_voice_confirm: false, prepaid_nudge: null, created_at: now(), reason: 'Prepaid · prefix 56' },
    { id: 'PK-1041', buyer_name: 'Meera Sharma', city: 'Jaipur', pincode: '302001', value: 1199, cod: true, status: 'delivered', courier: 'dakexpress', needs_voice_confirm: false, prepaid_nudge: 'gift_wrap', created_at: now(), reason: 'Repeat buyer · COD allowed' },
  ],
}

const subscribers = new Set<(event: OpsEvent) => void>()
const history: OpsEvent[] = []
const pendingReroute = new Set<number>()
const promptedOrders = new Set(['PK-1043'])
let eventId = 0
let orderId = 1043

function publish(type: OpsEvent['type'], actor: OpsEvent['actor'], title: string, detail: string, at = now()) {
  const event = { id: String(++eventId), at, type, actor, title, detail }
  history.push(event)
  subscribers.forEach((receive) => receive(event))
}

const initialTime = Date.now()
publish('order', 'pakka', 'Hubballi COD order placed', 'PK-1043 · ₹1,499 · Jaipur Kurta Co.', new Date(initialTime - 8000).toISOString())
publish('flag', 'flagsmith', 'Risky first COD matched', 'Prefix 58 → SwiftShip · voice confirmation required', new Date(initialTime - 4000).toISOString())
publish('voice', 'sarvam', 'Hinglish voice prompt ready', 'PK-1043 · Simulated audio', new Date(initialTime - 1000).toISOString())

function changeOrder(id: string, patch: Partial<Order>) {
  current = { ...current, orders: current.orders.map((order) => order.id === id ? { ...order, ...patch } : order) }
}

function getOrder(id: string) {
  const order = current.orders.find((item) => item.id === id)
  if (!order) throw new Error('Order is no longer available.')
  return order
}

function replaceCourier(on: boolean) {
  current = {
    ...current,
    couriers: current.couriers.map((courier) => courier.id === 'swiftship' ? {
      ...courier,
      status: on ? 'jammed' : 'ok',
      p95_ms: on ? 3420 : 124,
      error_rate: on ? 0.43 : 0.006,
    } : courier),
  }
}

function after(delay: number, callback: () => void) {
  const timer = window.setTimeout(() => {
    pendingReroute.delete(timer)
    callback()
  }, delay)
  pendingReroute.add(timer)
}

function reroute() {
  const orders = current.orders.filter((order) => order.courier === 'swiftship' && !['cancelled', 'delivered'].includes(order.status))
  current = {
    ...current,
    routing: { by_prefix: { '30': 'dakexpress', '56': 'dakexpress', '58': 'dakexpress' }, fallback: 'dakexpress' },
  }
  publish('flag', 'flagsmith', 'Routing updated', 'Prefixes 56 and 58 → DakExpress')
  for (const order of orders) {
    const updated = { ...order, courier: 'dakexpress' }
    changeOrder(order.id, {
      courier: updated.courier,
      status: 'rerouted',
      reason: 'Bengaluru hub jam · fallback',
      spoken_update: { text: updateText(updated), audio_wav_base64: null, simulated: true },
    })
  }
  if (orders.length) publish('voice', 'sarvam', 'Spoken updates queued', 'Affected buyers can see their updated courier')
}

function reply(id: string, transcript: string): Reply {
  const answer = transcript.toLowerCase()
  let intent: Reply['intent'] = 'unclear'
  if (answer.includes('nahi')) intent = 'cancel'
  else if (answer.includes('kal')) intent = 'reschedule'
  else if (answer.includes('haan')) intent = 'confirm'

  const order = getOrder(id)
  if (intent === 'confirm') {
    changeOrder(id, { status: order.spoken_update ? 'rerouted' : 'confirmed' })
  }
  if (intent === 'cancel') changeOrder(id, { status: 'cancelled' })
  publish('voice', 'buyer', 'Buyer replied', `${id} · ${transcript} → ${intent}`)
  if (intent === 'confirm') publish('courier', 'courier', 'Shipment accepted', `${id} · ${courierNames[order.courier]} · simulated`)
  return { transcript, intent }
}

export const mock = {
  async state() {
    return current
  },
  events(receive: (event: OpsEvent) => void, connection: (open: boolean) => void) {
    history.forEach(receive)
    subscribers.add(receive)
    connection(true)
    return () => { subscribers.delete(receive) }
  },
  async createOrder(): Promise<NewOrder> {
    const courier = current.routing.by_prefix['58'] ?? current.routing.fallback
    const reason = 'First-time COD · high RTO'
    const order = { ...sample, id: `PK-${++orderId}`, courier, reason, created_at: now() }
    current = { ...current, orders: [order, ...current.orders] }
    publish('order', 'pakka', 'Hubballi COD order placed', `${order.id} · ₹1,499 · Jaipur Kurta Co.`)
    publish('flag', 'flagsmith', 'Risky first COD matched', `Prefix 58 → ${courierNames[courier]} · voice confirmation required`)
    return { order, decision: { courier, needs_voice_confirm: true, prepaid_nudge: 'rs50_off', cod_allowed: true, reason } }
  },
  async voicePrompt(id: string): Promise<Voice> {
    const order = getOrder(id)
    if (!promptedOrders.has(id)) {
      promptedOrders.add(id)
      publish('voice', 'sarvam', 'Hinglish voice prompt ready', `${id} · Simulated audio`)
    }
    return {
      text: `Namaste ${order.buyer_name.split(' ')[0]}! Main Pakka se bol rahi hoon. Jaipur Kurta Co. ka ₹1,499 ka cash on delivery order bhej dein?`,
      audio_wav_base64: null,
      simulated: true,
    }
  },
  async replyText(id: string, transcript: string) {
    return reply(id, transcript)
  },
  async voiceReply(id: string, _audio: Blob): Promise<Reply> {
    getOrder(id)
    publish('voice', 'sarvam', 'Voice reply received', `${id} · Speech recognition is simulated`)
    return { transcript: '', intent: 'unclear' }
  },
  async jam(on: boolean) {
    if ((current.couriers[0]?.status === 'jammed') === on) return
    pendingReroute.forEach((timer) => window.clearTimeout(timer))
    pendingReroute.clear()
    replaceCourier(on)
    if (!on) {
      publish('courier', 'courier', 'Bengaluru hub recovered', 'SwiftShip is healthy · routing stays on DakExpress if rerouted')
      return
    }
    publish('incident', 'courier', 'Bengaluru hub jammed', 'SwiftShip · 3,420 ms p95 · 43% errors · simulated')
    after(1100, () => publish('incident', 'nudgebee', 'NudgeBee detected the jam', 'Kubernetes marked SwiftShip unhealthy'))
    after(2300, () => publish('ops', 'nudgebee', 'Waiting for approval', 'Reroute affected pincodes to DakExpress'))
    after(4100, () => {
      publish('ops', 'nudgebee', 'Demo approval received', 'Reroute runbook started · simulated approval')
      reroute()
    })
  },
}
