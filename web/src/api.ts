import { z } from 'zod'
import { demoOrder, eventNames, eventSchema, newOrderSchema, replySchema, stateSchema, voiceSchema } from './model'
import type { OpsEvent } from './model'
import { mock } from './mock'

const base = (import.meta.env.VITE_API_BASE || 'http://localhost:30080').replace(/\/+$/, '')
export const mockMode = import.meta.env.VITE_MOCK === '1' || new URLSearchParams(window.location.search).get('mock') === '1'

async function request(path: string, init?: RequestInit) {
  const response = await fetch(base + path, init)
  if (!response.ok) {
    const message = z.object({ error: z.string() }).safeParse(await response.json().catch(() => null))
    throw new Error(message.success ? message.data.error : `Request failed (HTTP ${response.status}).`)
  }
  return response
}

async function read<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)
  return schema.parse(await response.json())
}

function post(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

function orderPath(id: string) {
  return `/api/orders/${encodeURIComponent(id)}`
}

const live = {
  state: () => read(stateSchema, '/api/state'),
  createOrder: () => read(newOrderSchema, '/api/orders', post(demoOrder)),
  voicePrompt: (id: string) => read(voiceSchema, orderPath(id) + '/voice-prompt', { method: 'POST' }),
  replyText: (id: string, text: string) => read(replySchema, orderPath(id) + '/reply-text', post({ text })),
  voiceReply: (id: string, audio: Blob) => read(replySchema, orderPath(id) + '/voice-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: audio,
  }),
  async jam(on: boolean) {
    await request('/api/chaos/jam', post({ courier: 'swiftship', on }))
  },
  events(receive: (event: OpsEvent) => void, connection: (open: boolean) => void) {
    const stream = new EventSource(base + '/api/events')
    stream.onopen = () => connection(true)
    stream.onerror = () => connection(false)
    const handle = (message: MessageEvent<string>) => {
      try {
        const parsed = eventSchema.safeParse(JSON.parse(message.data))
        if (parsed.success) receive(parsed.data)
      } catch {
        // Ignore non-JSON stream messages.
      }
    }
    stream.onmessage = handle
    for (const name of eventNames) stream.addEventListener(name, handle)
    return () => stream.close()
  },
}

export const api = mockMode ? mock : live

export function errorText(error: unknown) {
  if (error instanceof z.ZodError) return 'The control tower returned an unexpected response.'
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}
