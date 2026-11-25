import { z } from 'zod'
import { eventSchema, replySchema, stateSchema } from './model'
import type { OpsEvent, OpsState, Reply } from './model'

const stepId = z.enum(['start', 'order', 'call', 'reply', 'jam', 'crash', 'reroute', 'update', 'end'])
const timestamp = z.iso.datetime({ offset: true })
const audioFile = z.string().regex(/^[\w-]+\.wav$/).nullable()
const recordingSchema = z.object({
  recorded_at: timestamp,
  order_id: z.string(),
  audio: z.object({ confirm: audioFile, update: audioFile }),
  voice_text: z.object({ confirm: z.string(), update: z.string() }),
  voice_simulated: z.object({ confirm: z.boolean(), update: z.boolean() }),
  steps: z.array(z.object({ id: stepId, label: z.string(), at: timestamp })).min(1),
  events: z.array(eventSchema.extend({ at: timestamp })),
  states: z.array(z.object({ at: timestamp, state: stateSchema })).min(1),
  proofs: z.object({ pods_crash: z.string().optional(), pods_after: z.string().optional() }),
})
const proofSchema = z.array(z.object({
  sponsor: z.string().min(1),
  title: z.string(),
  src: z.string().regex(/^\/proof\/[\w.-]+$/),
}))

export type ReplayStepId = z.infer<typeof stepId>
export type ProofImage = z.infer<typeof proofSchema>[number]
export type RecordedReply = Reply & { source: string }
export type ReplayClip = { text: string; src: string | undefined; simulated: boolean }

// YouTube id of the demo video, shown under the buyer view once it is uploaded.
export const demoVideo = ''

export const replayMode = import.meta.env.VITE_REPLAY === '1' || new URLSearchParams(window.location.search).get('replay') === '1'

async function readAsset<T>(schema: z.ZodType<T>, path: string, signal: AbortSignal) {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`)
  return schema.parse(await response.json())
}

// The run was recorded with the couriers' code names; show them as Courier 1 and Courier 2.
const plainNames = (text: string) => text
  .replace(/SwiftShip/g, 'Courier 1').replace(/DakExpress/g, 'Courier 2')
  .replace(/\bswiftship\b/g, 'courier 1').replace(/\bdakexpress\b/g, 'courier 2')

function recordedReply(events: OpsEvent[], id: string): RecordedReply | undefined {
  for (const event of events) {
    if (event.actor !== 'buyer') continue
    const transcript = / replied \([^)]+\): "(.*)"$/s.exec(event.title)?.[1]
    const details = /^intent (\w+) via (\w+); order (\S+) is /.exec(event.detail)
    if (!details || details[3] !== id) continue
    const reply = replySchema.safeParse({ transcript, intent: details[1] })
    if (reply.success) return { ...reply.data, source: details[2] }
  }
}

export const replay = {
  async load(signal: AbortSignal) {
    const run = await readAsset(recordingSchema, '/replay/run.json', signal)
    const snapshots = [...run.states].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    const events = [...run.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .map((event) => ({ ...event, title: plainNames(event.title), detail: plainNames(event.detail) }))
    const latestFirst = [...snapshots].reverse()
    const reply = recordedReply(events, run.order_id)
    const clip = (kind: 'confirm' | 'update'): ReplayClip => ({
      text: run.voice_text[kind],
      src: run.audio[kind] ? '/replay/' + run.audio[kind] : undefined,
      simulated: run.voice_simulated[kind],
    })
    const confirm = clip('confirm')
    const update = clip('update')
    const reached = (id: ReplayStepId, state: OpsState) => {
      const order = state.orders.find((item) => item.id === run.order_id)
      if (id === 'order') return Boolean(order)
      if (id === 'reply' && reply?.intent === 'confirm') return order?.status === 'confirmed'
      if (id === 'reply' && reply?.intent === 'cancel') return order?.status === 'cancelled'
      if (id === 'reroute') return Boolean(order?.spoken_update)
      if (id === 'crash') return state.couriers.some((courier) => courier.id === 'swiftship' && courier.status === 'jammed')
      return false
    }

    const frames = run.steps.map((step, index) => {
      const at = Date.parse(step.at)
      const next = run.steps[index + 1]
      const until = next ? Date.parse(next.at) : Infinity
      const current = latestFirst.find((snapshot) => Date.parse(snapshot.at) <= at)
      // A milestone can land just before the poll that captures its state change.
      const following = current && reached(step.id, current.state) ? undefined : snapshots.find((snapshot) => {
        const captured = Date.parse(snapshot.at)
        return captured > at && captured < until && reached(step.id, snapshot.state)
      })
      return {
        ...step,
        label: plainNames(step.label),
        state: (following ?? current ?? snapshots[0]).state,
        events: events.filter((event) => Date.parse(event.at) <= at).slice(0, 100),
        // The narrator's line, followed on the call and update steps by the recorded Sarvam call.
        audio: `/replay/narration/${step.id}.wav`,
      }
    })

    return { frames, confirm, update, reply, recordedAt: run.recorded_at, orderId: run.order_id, proofs: run.proofs }
  },
  proofImages: (signal: AbortSignal) => readAsset(proofSchema, '/proof/proof.json', signal),
}

export type ReplayRun = Awaited<ReturnType<typeof replay.load>>
