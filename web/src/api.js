import { z } from 'zod';
import { demoOrder, eventNames, eventSchema, newOrderSchema, replySchema, stateSchema, voiceSchema } from './model';
import { mock } from './mock';
const base = (import.meta.env.VITE_API_BASE || 'http://localhost:30080').replace(/\/+$/, '');
export const mockMode = import.meta.env.VITE_MOCK === '1' || new URLSearchParams(window.location.search).get('mock') === '1';
async function request(path, init) {
    const response = await fetch(base + path, init);
    if (!response.ok) {
        const message = z.object({ error: z.string(), use_typed_reply: z.boolean().optional() }).safeParse(await response.json().catch(() => null));
        if (message.success && message.data.use_typed_reply)
            throw new Error('Voice transcription is unavailable. Choose a text reply below.');
        throw new Error(message.success ? message.data.error : `Request failed (HTTP ${response.status}).`);
    }
    return response;
}
async function read(schema, path, init) {
    const response = await request(path, init);
    return schema.parse(await response.json());
}
function post(body) {
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function orderPath(id) {
    return `/api/orders/${encodeURIComponent(id)}`;
}
const live = {
    state: () => read(stateSchema, '/api/state'),
    createOrder: () => read(newOrderSchema, '/api/orders', post(demoOrder)),
    voicePrompt: (id) => read(voiceSchema, orderPath(id) + '/voice-prompt', { method: 'POST' }),
    replyText: (id, text) => read(replySchema, orderPath(id) + '/reply-text', post({ text })),
    voiceReply: (id, audio) => read(replySchema, orderPath(id) + '/voice-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: audio,
    }),
    async jam(on) {
        await request('/api/chaos/jam', post({ courier: 'swiftship', on }));
    },
    events(receive, connection) {
        const stream = new EventSource(base + '/api/events');
        stream.onopen = () => connection(true);
        stream.onerror = () => connection(false);
        const handle = (message) => {
            try {
                const parsed = eventSchema.safeParse(JSON.parse(message.data));
                if (parsed.success)
                    receive(parsed.data);
            }
            catch {
                // Ignore non-JSON stream messages.
            }
        };
        stream.onmessage = handle;
        for (const name of eventNames)
            stream.addEventListener(name, handle);
        return () => stream.close();
    },
};
export const api = mockMode ? mock : live;
export function errorText(error) {
    if (error instanceof z.ZodError)
        return 'The control tower returned an unexpected response.';
    return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
