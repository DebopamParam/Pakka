// Flagsmith: per-buyer evaluation (identities endpoint) and courier_routing edits (Admin API).

const FLAGSMITH_URL = (process.env.FLAGSMITH_URL || "http://host.orb.internal:8000").replace(/\/$/, "");
const ENV_KEY = process.env.FLAGSMITH_ENV_KEY || "6FBvm2ADWYXFgnoLnUgEGv";
const PROJECT_ID = process.env.FLAGSMITH_PROJECT_ID || "1";

// Contract defaults, used only when Flagsmith is unreachable or a flag does not exist yet.
export const DEFAULTS = {
  courier_routing: { by_prefix: { 56: "swiftship", 58: "swiftship", 30: "dakexpress" }, fallback: "dakexpress" },
  cod_policy: { cod_allowed: true, voice_confirm_above: 999, max_cod_value: 5000 },
  voice_confirm_enabled: true,
  prepaid_nudge: "rs50_off",
  peak_priority: { min_value: 2000, peak_in_flight: 40 },
};
const SEGMENT_POLICY = {
  rto_offender: { cod_allowed: false, voice_confirm_above: null, max_cod_value: 0 },
  repeat_buyer: { cod_allowed: true, voice_confirm_above: null, max_cod_value: 10000 },
  risky_first_cod: { cod_allowed: true, voice_confirm_above: 0, max_cod_value: 3000 },
};

export function segmentFor(traits) {
  if (traits.past_rto >= 2) return "rto_offender";
  if (traits.order_count >= 2) return "repeat_buyer";
  if (traits.order_count === 0 && traits.rto_risk === "high") return "risky_first_cod";
  return null;
}

function parseValue(v) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

async function fsFetch(path, { admin = false, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) headers.Authorization = `Api-Key ${process.env.FLAGSMITH_MASTER_API_KEY}`;
  else headers["X-Environment-Key"] = ENV_KEY;
  const res = await fetch(`${FLAGSMITH_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Flagsmith ${method} ${path.split("?")[0]} → HTTP ${res.status}`);
  return res.json();
}

// Turns a Flagsmith flags array into {name: value}; booleans come from `enabled`.
function flagMap(flags) {
  const out = {};
  for (const f of flags) {
    const name = f.feature.name;
    out[name] = name === "voice_confirm_enabled" ? f.enabled : parseValue(f.feature_state_value);
  }
  return out;
}

function withDefaults(found, traits) {
  const names = Object.keys(DEFAULTS);
  const present = names.filter((n) => n in found);
  const values = {};
  for (const n of names) values[n] = n in found ? found[n] : DEFAULTS[n];
  // Segment overrides live in Flagsmith; mirror them locally only when cod_policy itself is missing.
  const seg = traits && segmentFor(traits);
  if (!("cod_policy" in found) && seg) values.cod_policy = SEGMENT_POLICY[seg];
  const source = present.length === names.length ? "flagsmith" : present.length ? "flagsmith+defaults" : "local-defaults";
  return { values, source, missing: names.filter((n) => !(n in found)) };
}

export async function evaluateBuyer(identifier, traits) {
  try {
    const data = await fsFetch("/api/v1/identities/", {
      method: "POST",
      body: {
        identifier,
        traits: Object.entries(traits).map(([trait_key, trait_value]) => ({ trait_key, trait_value })),
      },
    });
    return withDefaults(flagMap(data.flags || []), traits);
  } catch (err) {
    return { ...withDefaults({}, traits), source: "local-defaults", error: err.message };
  }
}

export async function environmentFlags() {
  try {
    return withDefaults(flagMap(await fsFetch("/api/v1/flags/")));
  } catch (err) {
    return { ...withDefaults({}), source: "local-defaults", error: err.message };
  }
}

export function hasMasterKey() {
  return Boolean(process.env.FLAGSMITH_MASTER_API_KEY);
}

// Replaces every prefix mapped to `from` with `to` in the environment's courier_routing.
export async function rerouteCourier(from, to) {
  const features = await fsFetch(`/api/v1/projects/${PROJECT_ID}/features/?search=courier_routing`, { admin: true });
  const feature = (features.results || []).find((f) => f.name === "courier_routing");
  if (!feature) throw new Error("courier_routing flag not found in Flagsmith project");
  const states = await fsFetch(`/api/v1/environments/${ENV_KEY}/featurestates/?feature=${feature.id}`, { admin: true });
  const state = (states.results || []).find((s) => s.feature_segment == null && s.identity == null);
  if (!state) throw new Error("courier_routing environment feature state not found");

  const routing = parseValue(state.feature_state_value) || structuredClone(DEFAULTS.courier_routing);
  const changedPrefixes = Object.keys(routing.by_prefix || {}).filter((p) => routing.by_prefix[p] === from);
  if (changedPrefixes.length === 0) return { changed: false, prefixes: [], routing };

  const next = { ...routing, by_prefix: { ...routing.by_prefix } };
  for (const p of changedPrefixes) next.by_prefix[p] = to;
  await fsFetch(`/api/v1/environments/${ENV_KEY}/featurestates/${state.id}/`, {
    admin: true,
    method: "PATCH",
    body: { feature_state_value: JSON.stringify(next) },
  });
  return { changed: true, prefixes: changedPrefixes, routing: next };
}
