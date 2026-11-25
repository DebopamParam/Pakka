# Pakka control tower

Node 22 ESM service (plain `node:http`, one dependency: `sarvamai`). State is in memory; four demo orders are seeded
on start. Couriers are simulated. The API is defined in `notes/contract.md`.

## Environment

| Var | Default | Notes |
|---|---|---|
| `PORT` | `8080` | |
| `FLAGSMITH_URL` | `http://host.orb.internal:8000` | Use `http://localhost:8000` on the Mac |
| `FLAGSMITH_ENV_KEY` | Development key from the contract | Client-side key, not secret |
| `FLAGSMITH_PROJECT_ID` | `1` | |
| `FLAGSMITH_MASTER_API_KEY` | — | Secret. Needed by `/ops/reroute`; without it reroute returns 503 |
| `SARVAM_API_KEY` | — | Secret. Without it (or on any Sarvam error, e.g. 402) voice is `simulated:true` |
| `AZURE_ANTHROPIC_ENDPOINT`, `AZURE_ANTHROPIC_KEY` | — | Secret. Intent parsing via Claude; otherwise keyword fallback |
| `COURIER_SWIFTSHIP_URL` | `http://swiftship.pakka.svc:8080` | |
| `COURIER_DAKEXPRESS_URL` | `http://dakexpress.pakka.svc:8080` | |

If Flagsmith is unreachable or a flag is missing, the contract defaults are used and the decision's `flag_source` says
so (`local-defaults` or `flagsmith+defaults`).

## Run locally

```sh
npm ci
set -a; . ../../.env; . ../../flagsmith/.local-admin.env; set +a   # load secrets as env; never print them
FLAGSMITH_URL=http://localhost:8000 \
COURIER_SWIFTSHIP_URL=http://localhost:18081 COURIER_DAKEXPRESS_URL=http://localhost:18082 \
node src/server.js
```

Image: `docker build -t pakka/control-tower:dev .` (port 8080, runs as `node`).

## Endpoints

- `GET /healthz` → `ok`
- `GET /api/state` → `{orders, couriers, routing, incidents, simulated:true}`
- `GET /api/events` → SSE; replays the last 50 events, then streams. Events are unnamed (`onmessage`); `type` is in the JSON.
- `POST /api/orders` → `{order, decision}`; `decision.reason` names the segment/flag that decided it
- `POST /api/orders/:id/voice-prompt` → `{text, audio_wav_base64|null, simulated}`; plays a queued reroute update first if there is one
- `POST /api/orders/:id/voice-reply` (raw `audio/wav`) → `{transcript, intent, intent_source, order}`; 503 `{use_typed_reply:true}` if Sarvam STT fails
- `POST /api/orders/:id/reply-text` `{text}` → same as voice-reply
- `POST /api/chaos/jam` `{courier, on}` → proxies `POST /chaos` to that courier mock
- `POST /ops/reroute` `{from, to, reason}` → patches Flagsmith `courier_routing` (idempotent), moves in-flight orders, queues Hinglish updates
- `POST /hooks/flagsmith` → Flagsmith environment webhook, emitted as a `flag` event

Courier probes: `GET /quote` on each courier every 2s; `p95_ms` and `error_rate` over the last 10 probes; `jammed` when
`error_rate > 0.2` or `p95_ms > 1500`.
