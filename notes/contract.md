# Pakka: shared contract (read before building)

Pakka is a festive-season logistics control tower for Indian D2C brands. Shipping is free for the buyer, so a failed
COD delivery (RTO) costs the brand shipping both ways. The demo story:

1. A Jaipur kurta brand ships a Diwali COD order to a first-time buyer in Hubballi (pincode 580020).
2. Pakka evaluates Flagsmith for the buyer. They are high-risk, so a Hinglish voice call asks them to confirm (Sarvam).
3. The courier's Bengaluru hub jams (fault injection).
4. NudgeBee detects it, a human approves, and the runbook calls `/ops/reroute`.
5. The control tower updates Flagsmith `courier_routing`, and affected buyers hear a spoken update.

Everything courier-related is fictional and labelled **simulated**.

## Layout

```
services/control-tower/   Node 22 ESM service (Claude deb)
services/courier-mock/    one image, run twice as two couriers (Codex work)
k8s/                      manifests, namespace `pakka` (Codex work)
scripts/                  flagsmith-setup.mjs (Claude work), deploy.sh (Codex work)
web/                      Vite + React 19 + Tailwind v4 UI (Codex chandim)
design/quiet-motion/      design kit: read BRIEF.md, AGENTS.md, tokens/
```

## Runtime

- Kubernetes: OrbStack, context `orbstack`. Local docker images work directly (`imagePullPolicy: Never`).
- Flagsmith (self-hosted, already running):
  - From the Mac: `http://localhost:8000`.
  - From pods: `http://host.orb.internal:8000`.
  - Environment key (client side, not secret): Development `6FBvm2ADWYXFgnoLnUgEGv`.
  - Admin API: header `Authorization: Api-Key <FLAGSMITH_MASTER_API_KEY>`. The key comes from env, set from
    `flagsmith/.local-admin.env`.
- Control tower:
  - Port 8080 in the container.
  - Exposed on the Mac as NodePort **30080** (`http://localhost:30080`).
  - Service DNS in the cluster: `control-tower.pakka.svc:8080`.
- Couriers: `swiftship` (has the Bengaluru hub that jams) and `dakexpress` (the fallback). Port 8080 each; services
  `swiftship.pakka.svc` and `dakexpress.pakka.svc`.

## Secrets: hard rules

- Never print, log, hardcode or commit a key.
- Never `cat` `.env` or `flagsmith/.local-admin.env`. Load them as env only.
- Secrets come from env vars:
  - `FLAGSMITH_MASTER_API_KEY`
  - `SARVAM_API_KEY`
  - `AZURE_ANTHROPIC_ENDPOINT`, `AZURE_ANTHROPIC_KEY`
- In k8s they come from a Secret `pakka-secrets`, created by `deploy.sh` from the local env files and never written
  to the repo.

## Flagsmith flags (project 1, created by scripts/flagsmith-setup.mjs)

| Feature | Type | Default value |
|---|---|---|
| `courier_routing` | JSON | `{"by_prefix":{"56":"swiftship","58":"swiftship","30":"dakexpress"},"fallback":"dakexpress"}` |
| `cod_policy` | JSON | `{"cod_allowed":true,"voice_confirm_above":999,"max_cod_value":5000}` |
| `voice_confirm_enabled` | boolean | `true` |
| `prepaid_nudge` | multivariate, 50/50 | `rs50_off` or `gift_wrap` (control `rs50_off`) |

How these are used:

- **Prefixes:** a pincode's first 2 digits select the courier. Anything not listed uses `fallback`.
- **Reroute:** set the jammed courier's prefixes to the fallback.
- **Identity traits** (sent when evaluating a buyer): `order_count` (int), `order_value` (int ₹), `rto_risk`
  (`high` | `low`), `city`.
- **Segments:**
  - `repeat_buyer` (`order_count >= 2`) overrides `cod_policy` to `{"cod_allowed":true,"voice_confirm_above":null,"max_cod_value":10000}`.
  - `risky_first_cod` (`order_count = 0` AND `rto_risk = high`) overrides `cod_policy` to
    `{"cod_allowed":true,"voice_confirm_above":0,"max_cod_value":3000}`.

## Control tower HTTP API (JSON)

| Method | Path | Body / result |
|---|---|---|
| GET | `/api/state` | `{orders, couriers, routing, incidents, simulated:true}` (see shapes below) |
| GET | `/api/events` | Server-Sent Events. Each event: `{id, at, type, title, detail, actor}`. `type` ∈ `order`, `flag`, `voice`, `courier`, `incident`, `ops`; `actor` ∈ `pakka`, `flagsmith`, `nudgebee`, `sarvam`, `buyer`, `courier` |
| POST | `/api/orders` | `{buyer_name, phone_last4, pincode, city, value, cod, order_count, rto_risk}` → `{order, decision:{courier, needs_voice_confirm, prepaid_nudge, cod_allowed, reason}}` |
| POST | `/api/orders/:id/voice-prompt` | → `{text, audio_wav_base64 \| null, simulated:boolean}` (Sarvam TTS, Hinglish; `simulated:true` with null audio when Sarvam has no credits) |
| POST | `/api/orders/:id/voice-reply` | body: raw `audio/wav` → `{transcript, intent: "confirm"\|"cancel"\|"reschedule"\|"unclear"}` |
| POST | `/api/orders/:id/reply-text` | `{text}` → same as voice-reply. Typed fallback for the demo. |
| POST | `/api/chaos/jam` | `{courier:"swiftship", on:boolean}`: tells that courier mock to jam or recover |
| POST | `/ops/reroute` | `{from:"swiftship", to:"dakexpress", reason}`: patches Flagsmith `courier_routing`, emits events, queues spoken updates for affected orders. Called by the NudgeBee runbook from inside the cluster. |
| POST | `/hooks/flagsmith` | Flagsmith environment webhook → emits a `flag` event (the audit trail on screen) |
| GET | `/healthz` | `ok` |

Shapes:

- order: `{id, buyer_name, city, pincode, value, cod, status, courier, needs_voice_confirm, prepaid_nudge, created_at}`
  - `status` ∈ `placed`, `awaiting_confirm`, `confirmed`, `cancelled`, `in_transit`, `rerouted`, `delivered`
- courier: `{id, name, hub, status:"ok"|"jammed", p95_ms, error_rate, simulated:true}`
  - The control tower probes each courier every 2s to fill these.

## Courier mock API

| Method | Path | Behaviour |
|---|---|---|
| GET | `/quote?pincode=` | `{courier, eta_days}` |
| POST | `/shipments` | `{awb}` |
| POST | `/chaos` | `{on:boolean}` |
| GET | `/healthz` | When jammed: 2–4s latency plus about 40% HTTP 503 on `/quote` and `/shipments`, and `/healthz` returns 503, so the liveness/readiness probes fail and Kubernetes shows Unhealthy events and restarts. NudgeBee detects on those. |

The jam state is in memory; a restart clears it. That's fine because NudgeBee's fix is to reroute, not restart.
