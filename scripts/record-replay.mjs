// Records one real run of the demo for the public replay site (web/public/replay/).
// It drives the live control tower, keeps every event and state change with its real timestamp, saves the real
// Sarvam audio, and captures `kubectl get pods` when SwiftShip crashes. The reroute is NOT triggered here: the script
// waits until NudgeBee's automation (approved by a person in NudgeBee) changes the routing.
// Usage: node scripts/record-replay.mjs   (after ./scripts/reset-demo.sh)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const API = process.env.PAKKA_API || "http://localhost:30080";
const OUT = new URL("../web/public/replay/", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

const events = [];
const states = [];
const steps = [];
const proofs = {};

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 202) throw new Error(`${method} ${path}: HTTP ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function snapshot() {
  const state = await call("GET", "/api/state");
  const last = states.at(-1);
  if (!last || JSON.stringify(last.state) !== JSON.stringify(state)) states.push({ at: now(), state });
  return state;
}

function step(id, label) {
  steps.push({ id, label, at: now() });
  console.log(`${now()}  ${label}`);
}

function pods() {
  return execFileSync("kubectl", ["--context", "orbstack", "-n", "pakka", "get", "pods"], { encoding: "utf8" });
}

async function listen() {
  const res = await fetch(API + "/api/events");
  const reader = res.body.getReader();
  const seen = new Set();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += Buffer.from(value).toString("utf8");
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!data) continue;
      const ev = JSON.parse(data.slice(6));
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        events.push(ev);
      }
    }
  }
}

function saveAudio(name, voice) {
  if (!voice.audio_wav_base64) return null;
  writeFileSync(new URL(name, OUT), Buffer.from(voice.audio_wav_base64, "base64"));
  return name;
}

mkdirSync(OUT, { recursive: true });
listen();
const poller = setInterval(() => snapshot().catch(() => {}), 1000);

const start = await snapshot();
const startRouting = JSON.stringify(start.routing.by_prefix);
step("start", "Dashboard at rest");
await sleep(2000);

// A buyer with a bad return history: Flagsmith's rto_offender segment turns COD off (the API answers 422).
await call("POST", "/api/orders", {
  buyer_name: "Rahul Verma", phone_last4: "5521", pincode: "411038", city: "Pune",
  value: 1899, cod: true, order_count: 4, rto_risk: "low", past_rto: 3,
}).catch(() => null);
step("blocked", "Repeat returner: Flagsmith turns COD off");
await sleep(3000);

const created = await call("POST", "/api/orders", {
  buyer_name: "Aditi Kulkarni", phone_last4: "3208", pincode: "580020", city: "Hubballi",
  value: 1499, cod: true, order_count: 0, rto_risk: "high",
});
const id = created.order.id;
step("order", `New COD order ${id}: Flagsmith decides`);
await sleep(2000);

const confirmVoice = await call("POST", `/api/orders/${id}/voice-prompt`);
const confirmAudio = saveAudio("confirm.wav", confirmVoice);
step("call", "Sarvam calls the buyer in Hinglish");
await sleep(3000);

const reply = await call("POST", `/api/orders/${id}/reply-text`, { text: "Haan, koi problem nahi, bhej do" });
step("reply", `Buyer replies; ${reply.intent_source} reads "${reply.intent}"`);
await sleep(3000);

await call("POST", "/api/chaos/jam", { courier: "swiftship", on: true });
step("jam", "SwiftShip's Bengaluru hub jams");
for (let i = 0; i < 40 && !/CrashLoopBackOff/.test(proofs.pods_crash || ""); i++) {
  await sleep(1500);
  proofs.pods_crash = pods();
}
step("crash", "Kubernetes: SwiftShip in CrashLoopBackOff");

// At peak, a high-value cart for the jammed hub goes straight to the fallback courier.
await call("POST", "/api/orders", {
  buyer_name: "Rohan Mehta", phone_last4: "7734", pincode: "560076", city: "Bengaluru",
  value: 4999, cod: false, order_count: 3, rto_risk: "low",
});
step("priority", "High-value cart skips the jammed hub");

console.log("Waiting for NudgeBee: approve the pakka-hub-reroute run in NudgeBee (up to 15 minutes)...");
for (let i = 0; i < 900; i++) {
  const s = await snapshot();
  if (JSON.stringify(s.routing.by_prefix) !== startRouting) break;
  await sleep(1000);
}
step("reroute", "NudgeBee approved: runbook flipped Flagsmith routing");
await sleep(3000);

const updateVoice = await call("POST", `/api/orders/${id}/voice-prompt`);
const updateAudio = saveAudio("update.wav", updateVoice);
step("update", "Buyer hears the reroute update");
await sleep(2000);
proofs.pods_after = pods();
await snapshot();
step("end", "Done");

clearInterval(poller);
writeFileSync(
  new URL("run.json", OUT),
  JSON.stringify({
    recorded_at: steps[0].at,
    note: "Recorded from a real run of the live stack by scripts/record-replay.mjs.",
    order_id: id,
    audio: { confirm: confirmAudio, update: updateAudio },
    voice_text: { confirm: confirmVoice.text, update: updateVoice.text },
    voice_simulated: { confirm: confirmVoice.simulated, update: updateVoice.simulated },
    steps, events, states, proofs,
  }, null, 2),
);
console.log(`Saved ${states.length} states, ${events.length} events to web/public/replay/run.json`);
process.exit(0);
