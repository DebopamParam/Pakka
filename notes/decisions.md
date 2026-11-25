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

## 4. Detection: NudgeBee's own detection (verified)

- **Chosen:** an Event trigger on NudgeBee's own crash-loop detection:
  `{{ event.event_type == "report_crash_loop" and event.subject_namespace == "pakka" }}`.
  We copied the filter format from NudgeBee's "Create Automation" on a real event.
- **How the jam becomes a crash loop:** a jammed hub's service crashes (exit 1) a few seconds after the jam, and the
  jam is kept on an `emptyDir`, so it survives restarts. Kubernetes reports CrashLoopBackOff and NudgeBee raises
  "Pod pakka/swiftship-… is in CrashLoopBackOff".
- **What we learned:** NudgeBee ignores a container that exits cleanly (exit 0, "Completed"), and failing probes alone
  raised no event. Our first version handled SIGTERM gracefully and was never reported.
- **Verified 25 Nov, 13:55:** jam → crash loop → NudgeBee event → automation run → approval → script →
  `/ops/reroute` → Flagsmith `courier_routing` changed → 2 orders rerouted, incident mitigated.
- **Other routes:**
  - **Webhook from Pakka's SLO check:** weaker, the app reports its own problem; needs a webhook integration.
  - **Prometheus + Alertmanager into NudgeBee:** the production setup for latency and error-rate rules on courier
    calls. Too much wiring for today; named as the next step.
  - **Schedule trigger:** polling. Rejected as slower and not event-driven.

## 5. Unreliable network: it was OrbStack, not the venue Wi-Fi

- **Seen:** NudgeBee's agent kept failing to reach NudgeBee (`tls: bad record MAC`): 320 errors in 102 minutes,
  and a dropped crash-loop event.
- **Found:** on the phone hotspot, larger HTTPS uploads from *any* OrbStack container fail (6 of 6 at 300 KB, some at
  20 KB), to NudgeBee and to httpbin.org alike, while the same uploads from the Mac succeed. Lower MTU and turning off
  segmentation/checksum offload inside the pod did not help.
- **Chosen:** a 30-line CONNECT proxy on the Mac (`scripts/egress-proxy.mjs`). The NudgeBee agent sends its traffic
  through it (`HTTPS_PROXY=http://host.orb.internal:3128`, cluster addresses excluded). After that: 0 errors, and the
  relay connected first time.
- **Other routes:** restarting OrbStack (restarts every container, untested whether it helps); a different network
  (not available at the venue).
- **Also:** retries span about a minute (5 attempts from 5s, doubling). A retried flip is harmless because it sets the
  same value again. Before recording: a warm-up run and a backup take.

## 6. Voice in Hinglish with Sarvam

- **Chosen:** Sarvam Bulbul for the spoken COD confirmation and reroute updates, and Saaras in `codemix` mode for the
  buyer's spoken reply. The buyer speaks Hinglish.
- **Why:** many Tier-2 buyers miss or ignore English IVR calls. Hinglish is how they actually talk, and codemix STT
  is built for it.
- **Other routes:**
  - **Separate Kannada or Hindi voices:** possible with Sarvam. Hinglish covers the demo with one voice.
  - **WhatsApp or SMS confirmation:** the real-world channel, but it needs Business API approval. Out of scope today.
  - **Voice cloning:** rejected on principle.
- **Chat and intent parsing:** a separate LLM, Azure-hosted Claude (Opus 5.5, about 2s per reply). Sarvam is used only
  for speech. A keyword fallback runs if Claude is unreachable; it gets "haan, koi problem nahi, bhej do" wrong
  (reads "nahi" as cancel), which Claude gets right. That is why the LLM is there.

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
