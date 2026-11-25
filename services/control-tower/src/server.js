// Pakka control tower: orders, Flagsmith decisions, courier probes, voice, and the NudgeBee reroute hook.
import http from "node:http";
import { randomUUID } from "node:crypto";
import { DEFAULTS, environmentFlags, evaluateBuyer, hasMasterKey, rerouteCourier, segmentFor } from "./flagsmith.js";
import { parseIntent, speak, transcribe } from "./voice.js";

const PORT = Number(process.env.PORT || 8080);
const PROBE_MS = 2000;
const WINDOW = 10;

const couriers = {
  swiftship: {
    id: "swiftship",
    name: "Courier 1",
    hub: "Bengaluru",
    url: process.env.COURIER_SWIFTSHIP_URL || "http://swiftship.pakka.svc:8080",
  },
  dakexpress: {
    id: "dakexpress",
    name: "Courier 2",
    hub: "Pune",
    url: process.env.COURIER_DAKEXPRESS_URL || "http://dakexpress.pakka.svc:8080",
  },
};
for (const c of Object.values(couriers)) Object.assign(c, { status: "ok", p95_ms: 0, error_rate: 0, samples: [], probing: false });

const orders = [];
const incidents = [];
const events = [];
const clients = new Set();
let routing = { ...DEFAULTS.courier_routing, source: "local-defaults" };

const isRouting = (r) => Boolean(r && typeof r.by_prefix === "object" && r.by_prefix && typeof r.fallback === "string");
let orderSeq = 1000;

// ---------- events ----------

function emit(type, title, detail = "", actor = "pakka") {
  const ev = { id: randomUUID(), at: new Date().toISOString(), type, title, detail, actor };
  events.push(ev);
  if (events.length > 500) events.shift();
  const frame = `id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`;
  for (const res of clients) res.write(frame);
  console.log(`[${type}/${actor}] ${title}${detail ? ` — ${detail}` : ""}`);
  return ev;
}

// ---------- orders ----------

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const firstName = (name) => String(name).trim().split(/\s+/)[0];

function publicOrder(o) {
  const { traits, spoken_update, ...rest } = o;
  return { ...rest, spoken_update: spoken_update || null };
}

function courierFor(pincode, r) {
  const prefix = String(pincode).slice(0, 2);
  const mapped = r.by_prefix?.[prefix];
  return mapped ? { courier: mapped, why: `courier_routing maps ${prefix}xxxx → ${mapped}` } : { courier: r.fallback, why: `prefix ${prefix} not in courier_routing, fallback ${r.fallback}` };
}

async function createOrder(input, { background = false } = {}) {
  const value = Math.round(Number(input.value) || 0);
  const cod = Boolean(input.cod);
  const traits = {
    order_count: Math.max(0, Math.round(Number(input.order_count) || 0)),
    order_value: value,
    rto_risk: input.rto_risk === "high" ? "high" : "low",
    past_rto: Math.max(0, Math.round(Number(input.past_rto) || 0)),
    city: String(input.city || ""),
  };
  const identifier = `buyer-${String(input.phone_last4 || "0000")}-${firstName(input.buyer_name || "guest").toLowerCase()}`;
  const flags = await evaluateBuyer(identifier, traits);
  const { cod_policy: policy, voice_confirm_enabled: voiceOn, prepaid_nudge, peak_priority: peakRule } = flags.values;
  // If Flagsmith is unreachable or the value is malformed, keep the last routing we read rather than startup defaults,
  // so a timeout after a reroute never sends orders back to the jammed hub.
  const r = flags.source !== "local-defaults" && isRouting(flags.values.courier_routing) ? flags.values.courier_routing : routing;

  let route = courierFor(input.pincode, r);
  // At peak, a high-value cart never waits on a jammed hub for the runbook: it goes to the fallback courier at once.
  const inFlight = orders.filter((o) => !["cancelled", "delivered"].includes(o.status)).length;
  const peak = inFlight >= Number(peakRule?.peak_in_flight ?? Infinity);
  const priority = peak && value >= Number(peakRule?.min_value ?? Infinity);
  if (priority && couriers[route.courier]?.status === "jammed" && r.fallback !== route.courier) {
    route = { courier: r.fallback, why: `peak_priority: high-value cart skips jammed ${route.courier} → ${r.fallback}` };
  }
  const segment = segmentFor(traits);
  const codAllowed = Boolean(policy.cod_allowed) && value <= Number(policy.max_cod_value ?? Infinity);
  const above = policy.voice_confirm_above;
  const needsVoice = Boolean(voiceOn && cod && above != null && value > above);

  const segText = segment ? `segment ${segment}` : "no segment (default cod_policy)";
  let voiceWhy;
  if (!cod) voiceWhy = "prepaid, no voice confirmation";
  else if (!voiceOn) voiceWhy = "voice_confirm_enabled is off (kill switch)";
  else if (above == null) voiceWhy = `${segText}: cod_policy.voice_confirm_above is null, no voice confirmation`;
  else if (needsVoice) voiceWhy = `${segText}: COD ${inr(value)} > voice_confirm_above ${inr(above)}, voice confirmation needed`;
  else voiceWhy = `${segText}: COD ${inr(value)} ≤ voice_confirm_above ${inr(above)}, no voice confirmation`;
  const codWhy = codAllowed ? "" : policy.cod_allowed ? `; COD not allowed above max_cod_value ${inr(policy.max_cod_value)}` : "; COD off for this buyer (cod_allowed false)";
  const sourceWhy = flags.source === "flagsmith" ? "" : ` [${flags.source}${flags.missing?.length ? `: missing ${flags.missing.join(", ")}` : ""}]`;
  const priorityWhy = priority ? `; peak_priority: ${inr(value)} cart dispatched first` : "";
  const reason = `${voiceWhy}; ${route.why}${codWhy}${priorityWhy}${sourceWhy}`;
  if (cod && !codAllowed) {
    if (background) return null;
    emit("flag", `COD declined for ${input.buyer_name || "Guest"}`, `${reason}; prepaid offered instead`, "flagsmith");
    const why = policy.cod_allowed ? `above ${inr(policy.max_cod_value)}` : "after repeated returns";
    throw Object.assign(new Error(`COD is not available ${why} for this buyer. Offer prepaid instead.`), { status: 422 });
  }

  const order = {
    id: `PK-${++orderSeq}`,
    buyer_name: String(input.buyer_name || "Guest"),
    city: traits.city,
    pincode: String(input.pincode || ""),
    value,
    cod,
    status: needsVoice ? "awaiting_confirm" : "in_transit",
    courier: route.courier,
    needs_voice_confirm: needsVoice,
    prepaid_nudge: cod ? prepaid_nudge : null,
    created_at: new Date().toISOString(),
    background,
    priority,
    traits,
  };
  orders.push(order);
  if (background) return { order: publicOrder(order) };
  const decision = { courier: order.courier, needs_voice_confirm: needsVoice, prepaid_nudge: order.prepaid_nudge, cod_allowed: codAllowed, reason, flag_source: flags.source };

  emit("order", `Order ${order.id}: ${order.buyer_name}, ${order.city} ${order.pincode}`, `${inr(value)} ${cod ? "COD" : "prepaid"} via ${order.courier}`, "pakka");
  emit("flag", `Flagsmith evaluated ${order.buyer_name}`, reason, "flagsmith");
  return { order: publicOrder(order), decision };
}

function confirmText(o) {
  return `Namaste ${firstName(o.buyer_name)} ji, Pakka se bol rahe hain. Aapka ${inr(o.value)} ka Diwali order Cash on Delivery hai — kya aap confirm karte hain? Haan ya na boliye.`;
}

function rerouteText(o, from, to) {
  return `Namaste ${firstName(o.buyer_name)} ji, Pakka se ek zaroori update. ${couriers[from]?.hub || from} hub mein abhi deri chal rahi hai, isliye aapka ${inr(o.value)} ka order ab ${couriers[to]?.name || to} se bheja ja raha hai. Aapko kuch karne ki zaroorat nahi hai. Dhanyavaad!`;
}

// ---------- courier probes ----------

// A jammed courier crashes and sits in CrashLoopBackOff, so a single "recover" call can miss it.
// Keep retrying on each probe tick until the courier accepts it.
async function retryRecover(c) {
  try {
    const r = await fetch(`${c.url}/chaos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: false }),
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) return;
    c.recoverPending = false;
    emit("ops", `Fault cleared: ${c.name} ${c.hub} hub`, "recovery reached the courier (simulated)", "pakka");
  } catch {
    // Still restarting; try again on the next tick.
  }
}

async function probe(c) {
  if (c.recoverPending) await retryRecover(c);
  if (c.probing) return;
  c.probing = true;
  const start = Date.now();
  let ok = false;
  try {
    const res = await fetch(`${c.url}/quote?pincode=560001`, { signal: AbortSignal.timeout(5000) });
    ok = res.ok;
    await res.arrayBuffer();
  } catch {
    ok = false;
  }
  c.probing = false;
  c.samples.push({ ms: Date.now() - start, ok });
  if (c.samples.length > WINDOW) c.samples.shift();

  const sorted = c.samples.map((s) => s.ms).sort((a, b) => a - b);
  c.p95_ms = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  c.error_rate = Number((c.samples.filter((s) => !s.ok).length / c.samples.length).toFixed(2));
  const next = c.error_rate > 0.2 || c.p95_ms > 1500 ? "jammed" : "ok";
  if (next !== c.status) {
    c.status = next;
    const detail = `p95 ${c.p95_ms} ms, error rate ${Math.round(c.error_rate * 100)}% over last ${c.samples.length} probes (simulated courier)`;
    if (next === "jammed") {
      emit("courier", `${c.name} ${c.hub} hub jammed`, detail, "courier");
      incidents.push({ id: `INC-${incidents.length + 1}`, courier: c.id, title: `${c.name} ${c.hub} hub degraded`, status: "open", opened_at: new Date().toISOString(), mitigated_at: null, resolved_at: null });
      emit("incident", `Incident opened: ${c.name} ${c.hub} hub degraded`, detail, "pakka");
    } else {
      emit("courier", `${c.name} ${c.hub} hub recovered`, detail, "courier");
      for (const inc of incidents) {
        if (inc.courier === c.id && inc.status !== "resolved") {
          inc.status = "resolved";
          inc.resolved_at = new Date().toISOString();
          emit("incident", `Incident ${inc.id} resolved`, `${c.name} probes healthy again`, "pakka");
        }
      }
    }
  }
}

function publicCourier({ id, name, hub, status, p95_ms, error_rate }) {
  const in_flight = orders.filter((o) => o.courier === id && !["cancelled", "delivered"].includes(o.status)).length;
  return { id, name, hub, status, p95_ms, error_rate, in_flight, simulated: true };
}

// Flagsmith refuses webhooks to private addresses, so the control tower watches the environment's flag values and
// shows every change, whoever made it (the NudgeBee runbook or someone in the Flagsmith dashboard).
let lastFlags = null;

async function refreshRouting() {
  const env = await environmentFlags();
  if (env.source === "local-defaults" || !isRouting(env.values.courier_routing)) {
    if (routing.source !== "local-defaults") routing = { ...routing, source: "flagsmith (last known)" };
    return;
  }
  routing = { ...env.values.courier_routing, source: env.source };
  const now = Object.fromEntries(Object.entries(env.values).map(([k, v]) => [k, JSON.stringify(v)]));
  if (lastFlags) {
    for (const [name, value] of Object.entries(now)) {
      if (value !== lastFlags[name]) emit("flag", `Flagsmith: ${name} changed`, `${lastFlags[name]} → ${value}`, "flagsmith");
    }
  }
  lastFlags = now;
}

// ---------- HTTP ----------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body) {
  const isText = typeof body === "string";
  res.writeHead(status, { ...CORS, "Content-Type": isText ? "text/plain" : "application/json" });
  res.end(isText ? body : JSON.stringify(body));
}

async function readBody(req, limit = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("body too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid JSON body"), { status: 400 });
  }
}

function findOrder(id) {
  const o = orders.find((x) => x.id === id);
  if (!o) throw Object.assign(new Error(`order ${id} not found`), { status: 404 });
  return o;
}

const STATUS_FOR_INTENT = { confirm: "confirmed", cancel: "cancelled" };

async function applyReply(o, transcript, via) {
  const parsed = await parseIntent(transcript);
  if (STATUS_FOR_INTENT[parsed.intent] && o.status === "awaiting_confirm") o.status = STATUS_FOR_INTENT[parsed.intent];
  emit("voice", `${o.buyer_name} replied (${via}): "${transcript}"`, `intent ${parsed.intent} via ${parsed.intent_source}; order ${o.id} is ${o.status}`, "buyer");
  return { transcript, ...parsed, order: publicOrder(o) };
}

const routes = [
  ["GET", /^\/healthz$/, async (req, res) => send(res, 200, "ok")],

  ["GET", /^\/api\/state$/, async (req, res) =>
    send(res, 200, {
      orders: orders.map(publicOrder),
      couriers: Object.values(couriers).map(publicCourier),
      routing,
      incidents,
      simulated: true,
    })],

  ["GET", /^\/api\/events$/, async (req, res) => {
    res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 2000\n\n");
    for (const ev of events.slice(-50)) res.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
  }],

  ["POST", /^\/api\/orders$/, async (req, res) => send(res, 201, await createOrder(await readJson(req)))],

  ["POST", /^\/api\/orders\/([^/]+)\/voice-prompt$/, async (req, res, id) => {
    const o = findOrder(id);
    // After a reroute the update is what the buyer needs to hear, so it is served on every request (reloads, a second tab).
    const text = o.spoken_update ? o.spoken_update.text : confirmText(o);
    const tts = await speak(text);
    emit("voice", `Calling ${o.buyer_name} in Hinglish`, tts.simulated ? `${text} (simulated: ${tts.error})` : text, "sarvam");
    send(res, 200, { text, audio_wav_base64: tts.audio, simulated: tts.simulated, ...(tts.error ? { error: tts.error } : {}) });
  }],

  ["POST", /^\/api\/orders\/([^/]+)\/voice-reply$/, async (req, res, id) => {
    const o = findOrder(id);
    const wav = await readBody(req);
    if (!wav.length) return send(res, 400, { error: "send the reply as a raw audio/wav body" });
    const stt = await transcribe(wav);
    if (stt.error) {
      emit("voice", `Speech-to-text unavailable for ${o.id}`, `${stt.error}; use the typed reply`, "sarvam");
      return send(res, 503, { error: stt.error, use_typed_reply: true, simulated: true });
    }
    send(res, 200, await applyReply(o, stt.transcript, "voice"));
  }],

  ["POST", /^\/api\/orders\/([^/]+)\/reply-text$/, async (req, res, id) => {
    const o = findOrder(id);
    const { text } = await readJson(req);
    if (!text || typeof text !== "string") return send(res, 400, { error: "body must be {text}" });
    send(res, 200, await applyReply(o, text.trim(), "typed"));
  }],

  ["POST", /^\/api\/chaos\/jam$/, async (req, res) => {
    const { courier = "swiftship", on = true } = await readJson(req);
    const c = couriers[courier];
    if (!c) return send(res, 400, { error: `unknown courier ${courier}` });
    try {
      const r = await fetch(`${c.url}/chaos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: Boolean(on) }),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      c.recoverPending = false;
    } catch (err) {
      if (on) return send(res, 502, { error: `could not reach ${c.name} at ${c.url}: ${err.message}` });
      c.recoverPending = true;
      emit("ops", `Recovery queued: ${c.name} ${c.hub} hub`, "the courier is restarting; retrying every 2s", "pakka");
      return send(res, 202, { ok: true, courier, on: false, queued: true });
    }
    emit("ops", on ? `Fault injected: ${c.name} ${c.hub} hub jammed` : `Fault cleared: ${c.name} ${c.hub} hub`, "simulated courier", "pakka");
    send(res, 200, { ok: true, courier, on: Boolean(on) });
  }],

  ["POST", /^\/ops\/reroute$/, async (req, res) => {
    const { from, to, reason = "" } = await readJson(req);
    if (!couriers[from] || !couriers[to] || from === to) return send(res, 400, { error: "body must be {from, to, reason} with two different known couriers" });
    if (!hasMasterKey()) return send(res, 503, { error: "FLAGSMITH_MASTER_API_KEY is not set on the control tower; courier_routing was NOT changed" });
    emit("ops", `Reroute requested: ${from} → ${to}`, reason || "no reason given", "nudgebee");

    let result;
    try {
      result = await rerouteCourier(from, to);
    } catch (err) {
      emit("ops", "Reroute failed", err.message, "pakka");
      return send(res, 502, { error: `Flagsmith update failed: ${err.message}; courier_routing was NOT changed` });
    }
    routing = { ...result.routing, source: "flagsmith" };
    if (result.changed) {
      emit("flag", "courier_routing updated", `prefixes ${result.prefixes.join(", ")} now → ${to}`, "flagsmith");
    }

    // High-value carts move first.
    const affected = orders.filter((o) => o.courier === from && !["cancelled", "delivered"].includes(o.status)).sort((a, b) => Number(b.priority) - Number(a.priority));
    const firsts = affected.filter((o) => o.priority).length;
    for (const o of affected) {
      o.courier = to;
      // A buyer still mid-confirmation keeps that status so their reply still counts.
      if (o.status !== "awaiting_confirm") o.status = "rerouted";
      o.spoken_update = { text: rerouteText(o, from, to), played: false };
      if (!o.background) emit("voice", `Spoken update queued for ${o.buyer_name}`, o.spoken_update.text, "pakka");
    }
    const now = new Date().toISOString();
    for (const inc of incidents) {
      if (inc.courier === from && inc.status === "open") {
        inc.status = "mitigated";
        inc.mitigated_at = now;
        emit("incident", `Incident ${inc.id} mitigated`, `traffic rerouted ${from} → ${to}`, "nudgebee");
      }
    }
    emit("ops", `${result.changed ? "Rerouted" : "Already rerouted"} ${couriers[from]?.name || from} → ${couriers[to]?.name || to}`, `${affected.length} in-flight order(s) moved${firsts ? `, ${firsts} high-value first` : ""}`, "pakka");
    send(res, 200, { ok: true, changed: result.changed, prefixes: result.prefixes, routing: result.routing, affected_orders: affected.map((o) => o.id) });
  }],

  ["POST", /^\/hooks\/flagsmith$/, async (req, res) => {
    const body = await readJson(req);
    const data = body.data || {};
    const state = data.new_state || data.previous_state || {};
    const name = state.feature?.name || "a flag";
    const by = data.changed_by ? ` by ${data.changed_by}` : "";
    const value = data.new_state ? `enabled=${data.new_state.enabled}, value=${data.new_state.feature_state_value ?? "null"}` : "deleted";
    emit("flag", `Flagsmith: ${name} changed${by}`, `${body.event_type || "FLAG_UPDATED"}: ${value}`, "flagsmith");
    if (name === "courier_routing") refreshRouting();
    send(res, 200, { ok: true });
  }],
];

// ---------- background traffic (simulated) ----------

// A festive day has hundreds of orders in flight, so the dashboard runs a stream of simulated orders through the same
// Flagsmith decisions. They stay out of the activity feed; the demo order and the reroute summary stay readable.
const TRAFFIC_MS = Number(process.env.TRAFFIC_MS ?? 2500);
const TRAFFIC_START = Number(process.env.TRAFFIC_START ?? 60);
const TRAFFIC_MAX = 400;
const NAMES = ["Priya Nair", "Rahul Verma", "Sneha Iyer", "Vikram Singh", "Kavya Reddy", "Amit Joshi", "Pooja Desai", "Karan Mehta", "Divya Menon", "Rohit Gowda", "Neha Kulkarni", "Suresh Hegde", "Anjali Gupta", "Farhan Sheikh", "Lakshmi Rao", "Manoj Shetty", "Ishita Bose", "Nikhil Kamath", "Shreya Pillai", "Varun Bhat"];
const PLACES = [
  ["Bengaluru", "560076"], ["Bengaluru", "560102"], ["Bengaluru", "560011"], ["Hubballi", "580031"], ["Dharwad", "580008"],
  ["Mysuru", "570017"], ["Belagavi", "590006"], ["Jaipur", "302017"], ["Mumbai", "400053"], ["Pune", "411038"],
  ["Delhi", "110024"], ["Chennai", "600040"], ["Kolkata", "700029"], ["Hyderabad", "500081"],
];
const VALUES = [499, 799, 899, 1199, 1499, 1799, 2499, 3299];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function backgroundOrder() {
  if (orders.filter((o) => o.background).length >= TRAFFIC_MAX) return;
  const [city, pincode] = pick(PLACES);
  const created = await createOrder({
    buyer_name: pick(NAMES), phone_last4: String(1000 + Math.floor(Math.random() * 9000)), pincode, city,
    value: pick(VALUES), cod: Math.random() < 0.65, order_count: Math.floor(Math.random() * 6), rto_risk: Math.random() < 0.25 ? "high" : "low", past_rto: Math.random() < 0.1 ? 2 + Math.floor(Math.random() * 3) : 0,
  }, { background: true }).catch(() => null);
  const o = created && orders.find((x) => x.id === created.order.id);
  // Simulated buyers answer their confirmation call within a few seconds; no real call is made for them.
  if (o?.status === "awaiting_confirm") {
    setTimeout(() => { if (o.status === "awaiting_confirm") o.status = Math.random() < 0.85 ? "confirmed" : "cancelled"; }, 8000 + Math.random() * 20000);
  }
}

async function startTraffic() {
  if (!TRAFFIC_MS) return;
  for (let i = 0; i < TRAFFIC_START; i++) await backgroundOrder();
  emit("ops", `Simulated festive traffic: ${TRAFFIC_START} orders in flight`, `a new simulated order every ${TRAFFIC_MS / 1000}s, routed by Flagsmith`, "pakka");
  setInterval(backgroundOrder, TRAFFIC_MS);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  const path = new URL(req.url, "http://x").pathname;
  for (const [method, pattern, handler] of routes) {
    const m = path.match(pattern);
    if (m && req.method === method) {
      try {
        return await handler(req, res, ...m.slice(1).map(decodeURIComponent));
      } catch (err) {
        if (!res.headersSent) send(res, err.status || 500, { error: err.message });
        return;
      }
    }
  }
  send(res, 404, { error: `no route for ${req.method} ${path}` });
});

const SEED = [
  { buyer_name: "Ravi Kumar", phone_last4: "4821", pincode: "580001", city: "Dharwad", value: 1799, cod: true, order_count: 3, rto_risk: "low" },
  { buyer_name: "Ananya Rao", phone_last4: "1093", pincode: "560034", city: "Bengaluru", value: 2499, cod: true, order_count: 6, rto_risk: "low" },
  { buyer_name: "Meera Shah", phone_last4: "7710", pincode: "302001", city: "Jaipur", value: 899, cod: false, order_count: 1, rto_risk: "low" },
  { buyer_name: "Arjun Patil", phone_last4: "3356", pincode: "590001", city: "Belagavi", value: 899, cod: true, order_count: 1, rto_risk: "low" },
  { buyer_name: "Kavya Iyer", phone_last4: "6642", pincode: "560076", city: "Bengaluru", value: 4999, cod: false, order_count: 4, rto_risk: "low" },
  { buyer_name: "Vikram Singh", phone_last4: "2087", pincode: "570017", city: "Mysuru", value: 1299, cod: true, order_count: 5, rto_risk: "low", past_rto: 3 },
];

server.listen(PORT, async () => {
  console.log(`control tower on :${PORT}`);
  emit("ops", "Control tower started", "couriers are simulated", "pakka");
  await refreshRouting();
  await startTraffic();
  for (const o of SEED) await createOrder(o).catch(() => null); // Vikram's COD is declined by design.
  for (const c of Object.values(couriers)) setInterval(() => probe(c), PROBE_MS);
  setInterval(refreshRouting, 3000);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
