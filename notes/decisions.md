# Pakka: decisions and the routes we did not take

Pakka is a festive-season logistics control tower for Indian D2C brands. Shipping is free for the buyer, so when a COD
parcel comes back unopened (RTO), the brand pays shipping both ways. Pakka cuts failed COD deliveries and reroutes
around jammed courier hubs.

Team: solo. Built at Festive Hacks, 25 Nov 2026.

Each entry: what we chose, why, and what else we could have done.

## 1. Approvals happen in the NudgeBee screen

- **Chosen:** NudgeBee's built-in Approval step. The run waits at "Waiting for approval" and records who approved.
- **Why:** it works out of the box and keeps the whole demo inside the sponsor's product.
- **Other routes:**
  - **Slack approval:** NudgeBee has Slack actions, and we have a workspace. That's the production choice, since
    on-call staff live in Slack. We skipped it to save setup time on the day.
  - **Microsoft Teams or Google Chat:** NudgeBee supports both. Same trade-off.

## 2. NudgeBee reaches Flagsmith through Run Script, not the HTTP step

- **Chosen:** a `scripting.run_script` step. NudgeBee's agent runs it as a short-lived pod inside our Kubernetes
  cluster, next to Flagsmith.
- **Why:** the HTTP step runs on NudgeBee's servers and blocks private addresses. We verified both: the HTTP step
  failed to resolve the local host, and Run Script returned `flagsmith 200`.
- **Other routes:**
  - **Public tunnel to Flagsmith** (for example Cloudflare Tunnel), so the HTTP step works. Rejected: it puts the
    Flagsmith admin screen on the internet and adds another link the venue Wi-Fi can break.
  - **Flagsmith's hosted cloud** instead of self-hosting. Rejected: we would lose the self-hosted story and redo the
    setup.

## 3. The Flagsmith admin key stays in Pakka's control tower

- **Chosen:** NudgeBee's script calls Pakka's control tower inside the cluster (`/ops/reroute`). Only the control
  tower holds the Flagsmith admin key, and it makes the change.
- **Why:** if the key were in the script, it would sit in plain text in NudgeBee's automation (and in our repo). This
  way each secret lives in one place, and each system does one job:
  - NudgeBee detects the problem and gets a human's approval.
  - Pakka owns the logistics rules and the key.
  - Flagsmith holds the live config and its audit log.
- **Other routes:**
  - **Key in the script:** simpler, but it leaks the key.
  - **NudgeBee's own secret store:** we did not explore it today.
- **Caveat:** we have not checked whether OrbStack enforces Kubernetes network policies, so restricting callers to
  NudgeBee's pods is unverified.

## 4. Detection: NudgeBee's own detection first, a webhook as fallback

- **Chosen (being tested):** an Event trigger. The courier hub pod fails in a way Kubernetes can see, NudgeBee
  notices, and NudgeBee starts the runbook itself.
- **Why:** NudgeBee then really does detect → explain → approve → act. With a webhook from our app, the app would be
  reporting its own problem.
- **Other routes:**
  - **Webhook from Pakka's SLO check:** simple, but weaker evidence that NudgeBee did the detecting. It needs a webhook
    integration created in NudgeBee first. This is the fallback.
  - **Prometheus + Alertmanager alerts into NudgeBee:** the standard production setup, with latency and error-rate
    rules on courier calls. Skipped because it needs the monitoring stack enabled and wired (Alertmanager pointed at
    the NudgeBee runner). Too much for today; named as the next step.
  - **Schedule trigger:** poll health every minute. Rejected as slower and not event-driven.

## 5. Unreliable network at the venue

- **Seen:** the NudgeBee link dropped every 15–30 minutes on venue Wi-Fi (`tls: bad record MAC`).
- **Chosen:** use the phone hotspot. Retries now span about a minute: 5 attempts, starting at 5s and doubling. A
  retried flip is harmless because it just sets the same value again.
- **Backup:** a warm-up run before recording, recording in segments, and a backup take.

## 6. Voice in Hinglish with Sarvam

- **Chosen:** Sarvam Bulbul for the spoken COD confirmation and reroute updates, and Saaras in `codemix` mode for the
  buyer's spoken reply. The buyer speaks Hinglish.
- **Why:** many Tier-2 buyers miss or ignore English IVR calls. Hinglish is how they actually talk, and codemix STT
  is built for it.
- **Other routes:**
  - **Separate Kannada or Hindi voices:** possible with Sarvam. Hinglish covers the demo with one voice.
  - **WhatsApp or SMS confirmation:** the real-world channel, but it needs Business API approval. Out of scope today.
  - **Voice cloning:** rejected on principle.
- **Chat and intent parsing:** a separate LLM, Azure-hosted Claude. Sarvam is used only for speech.

## 7. Flagsmith carries the live logistics rules

- **Remote config:** `courier_routing` (pincode prefix → courier plus fallback) and `cod_policy`.
- **Segments:** repeat buyers keep COD, and first-time, high-value orders from high-RTO pincodes need voice
  confirmation.
- **A/B test:** the prepaid nudge, "₹50 off prepaid" vs "free gift wrap".
- **Kill switch:** `voice_confirm_enabled`.
- **Flipped programmatically** by the approved NudgeBee runbook.
- **Audit trail on screen:** Flagsmith refuses webhooks to private addresses, and its audit-log API fails with a master
  API key (a server error in self-hosted Flagsmith). So the control tower watches the flag values every few seconds
  and shows any change, whoever made it, including edits in the Flagsmith dashboard. With a public URL, the
  environment webhook would replace the polling.
- **Other routes:**
  - **Hard-coded rules or a database table:** a deploy is needed for each change, with no audit trail and no
    per-segment targeting.
  - **Kubernetes ConfigMaps:** these are infrastructure, not business rules, and they can't do segments or A/B tests.

## Simulated, and labelled as such

- The couriers are mock services. No real courier APIs, phone calls, payments or maps.
- Any number we did not measure is marked "simulated".
