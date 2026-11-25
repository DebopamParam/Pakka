import { z } from 'zod'

const statuses = z.enum(['placed', 'awaiting_confirm', 'confirmed', 'cancelled', 'in_transit', 'rerouted', 'delivered'])
const eventType = z.enum(['order', 'flag', 'voice', 'courier', 'incident', 'ops'])
export const eventNames = eventType.options
const actor = z.enum(['pakka', 'flagsmith', 'nudgebee', 'sarvam', 'buyer', 'courier'])

export const voiceSchema = z.object({
  text: z.string(),
  audio_wav_base64: z.string().nullable(),
  simulated: z.boolean(),
})

const decisionSchema = z.object({
  courier: z.string(),
  needs_voice_confirm: z.boolean(),
  prepaid_nudge: z.string().nullable(),
  cod_allowed: z.boolean(),
  reason: z.string(),
})

const orderSchema = z.object({
  id: z.string(),
  buyer_name: z.string(),
  city: z.string(),
  pincode: z.coerce.string(),
  value: z.number(),
  cod: z.boolean(),
  status: statuses,
  courier: z.string(),
  needs_voice_confirm: z.boolean(),
  prepaid_nudge: z.string().nullable(),
  created_at: z.string(),
  background: z.boolean().optional(),
  priority: z.boolean().optional(),
  reason: z.string().optional(),
  decision_reason: z.string().optional(),
  decision: decisionSchema.optional(),
  spoken_update: z.object({
    text: z.string(),
    played: z.boolean().optional(),
    audio_wav_base64: z.string().nullable().optional(),
    simulated: z.boolean().optional(),
  }).nullish(),
})

const courierSchema = z.object({
  id: z.string(),
  name: z.string(),
  hub: z.string(),
  status: z.enum(['ok', 'jammed']),
  p95_ms: z.number().nullable(),
  error_rate: z.number().nullable(),
  in_flight: z.number().optional(),
  simulated: z.boolean(),
})

export const routingSchema = z.object({ by_prefix: z.record(z.string(), z.string()), fallback: z.string(), source: z.string().optional() })
export const stateSchema = z.object({
  orders: z.array(orderSchema),
  couriers: z.array(courierSchema),
  routing: routingSchema,
  incidents: z.array(z.unknown()),
  simulated: z.boolean(),
})

export const eventSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  at: z.string(),
  type: eventType,
  title: z.string(),
  detail: z.string(),
  actor,
})

export const newOrderSchema = z.object({ order: orderSchema, decision: decisionSchema })
export const replySchema = z.object({
  transcript: z.string(),
  intent: z.enum(['confirm', 'cancel', 'reschedule', 'unclear']),
})

export type OpsState = z.infer<typeof stateSchema>
export type OpsEvent = z.infer<typeof eventSchema>
export type Order = z.infer<typeof orderSchema>

// Demo orders first, then the simulated background traffic, each newest first.
export function sortOrders(orders: Order[]) {
  return [...orders].sort((a, b) => Number(a.background ?? false) - Number(b.background ?? false) || b.created_at.localeCompare(a.created_at))
}
export type Courier = z.infer<typeof courierSchema>
export type NewOrder = z.infer<typeof newOrderSchema>
export type Reply = z.infer<typeof replySchema>
export type Voice = z.infer<typeof voiceSchema>

export const demoOrder = {
  buyer_name: 'Aditi Kulkarni',
  phone_last4: '3208',
  pincode: '580020',
  city: 'Hubballi',
  value: 1499,
  cod: true,
  order_count: 0,
  rto_risk: 'high',
}

export const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const time = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export const statusLabels: Record<Order['status'], string> = {
  placed: 'Placed',
  awaiting_confirm: 'Awaiting reply',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  in_transit: 'In transit',
  rerouted: 'Rerouted',
  delivered: 'Delivered',
}

export const courierNames: Record<string, string> = {
  swiftship: 'Courier 1',
  dakexpress: 'Courier 2',
}

export function updateText(order: Order) {
  return `Namaste ${order.buyer_name.split(' ')[0]}! Aapka Jaipur Kurta Co. order ab ${courierNames[order.courier] ?? order.courier} se aayega. Cash on delivery pehle jaisa hi rahega.`
}
