// Creates Pakka's flags, segments and segment overrides in Flagsmith. Safe to re-run.
// Usage: node scripts/flagsmith-setup.mjs   (reads FLAGSMITH_MASTER_API_KEY from flagsmith/.local-admin.env)

process.loadEnvFile(new URL("../flagsmith/.local-admin.env", import.meta.url));

const BASE = process.env.FLAGSMITH_URL ?? "http://localhost:8000";
const PROJECT = Number(process.env.FLAGSMITH_PROJECT_ID ?? 1);
const ENV_KEY = process.env.FLAGSMITH_ENV_KEY ?? "6FBvm2ADWYXFgnoLnUgEGv"; // our Development environment
const WEBHOOK_URL = process.env.PAKKA_WEBHOOK_URL;
const LEGACY = ["surge_mode", "degradation_policy", "wait_offer"];

const FEATURES = [
  {
    name: "courier_routing",
    value: { by_prefix: { 56: "swiftship", 58: "swiftship", 30: "dakexpress" }, fallback: "dakexpress" },
    description: "Pincode prefix (2 digits) to courier, plus the fallback courier.",
  },
  {
    name: "cod_policy",
    value: { cod_allowed: true, voice_confirm_above: 999, max_cod_value: 5000 },
    description: "Cash-on-delivery rules. Segments override it.",
  },
  { name: "voice_confirm_enabled", boolean: true, description: "Kill switch for Sarvam voice confirmation calls." },
  {
    name: "prepaid_nudge",
    value: "rs50_off",
    variants: [{ value: "gift_wrap", percent: 50 }],
    description: "A/B test: which nudge moves COD buyers to prepaid.",
  },
];

const SEGMENTS = [
  {
    name: "repeat_buyer",
    conditions: [{ property: "order_count", operator: "GREATER_THAN_INCLUSIVE", value: "2" }],
    overrides: { cod_policy: { cod_allowed: true, voice_confirm_above: null, max_cod_value: 10000 } },
  },
  {
    name: "risky_first_cod",
    conditions: [
      { property: "order_count", operator: "EQUAL", value: "0" },
      { property: "rto_risk", operator: "EQUAL", value: "high" },
    ],
    overrides: { cod_policy: { cod_allowed: true, voice_confirm_above: 0, max_cod_value: 3000 } },
  },
];

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { Authorization: `Api-Key ${process.env.FLAGSMITH_MASTER_API_KEY}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const asValue = (v) => (typeof v === "string" ? v : JSON.stringify(v));

const env = await api("GET", `/environments/${ENV_KEY}/`);
let features = (await api("GET", `/projects/${PROJECT}/features/?page_size=100`)).results;

for (const f of features.filter((f) => LEGACY.includes(f.name))) {
  await api("DELETE", `/projects/${PROJECT}/features/${f.id}/`);
  console.log(`deleted legacy feature ${f.name}`);
}
for (const s of (await api("GET", `/projects/${PROJECT}/segments/?page_size=100`)).results) {
  if (s.name === "vip") {
    await api("DELETE", `/projects/${PROJECT}/segments/${s.id}/`);
    console.log("deleted legacy segment vip");
  }
}
features = (await api("GET", `/projects/${PROJECT}/features/?page_size=100`)).results;

const featureIds = {};
for (const spec of FEATURES) {
  let feature = features.find((f) => f.name === spec.name);
  if (!feature) {
    feature = await api("POST", `/projects/${PROJECT}/features/`, {
      name: spec.name,
      description: spec.description,
      type: spec.variants ? "MULTIVARIATE" : "STANDARD",
      default_enabled: true,
      initial_value: spec.boolean === undefined ? asValue(spec.value) : null,
      multivariate_options: (spec.variants ?? []).map((v) => ({
        type: "unicode",
        string_value: v.value,
        default_percentage_allocation: v.percent,
      })),
    });
    console.log(`created ${spec.name}`);
  }
  featureIds[spec.name] = feature.id;

  // Reset the Development value, so a re-run also undoes a demo reroute.
  const [state] = (await api("GET", `/environments/${ENV_KEY}/featurestates/?feature=${feature.id}`)).results;
  await api("PATCH", `/environments/${ENV_KEY}/featurestates/${state.id}/`, {
    enabled: spec.boolean ?? true,
    ...(spec.boolean === undefined && { feature_state_value: asValue(spec.value) }),
  });
}

const segments = (await api("GET", `/projects/${PROJECT}/segments/?page_size=100`)).results;
for (const spec of SEGMENTS) {
  let segment = segments.find((s) => s.name === spec.name);
  if (!segment) {
    segment = await api("POST", `/projects/${PROJECT}/segments/`, {
      name: spec.name,
      project: PROJECT,
      rules: [{ type: "ALL", rules: [{ type: "ALL", conditions: spec.conditions }] }],
    });
    console.log(`created segment ${spec.name}`);
  }

  for (const [featureName, value] of Object.entries(spec.overrides)) {
    const feature = featureIds[featureName];
    const existing = (
      await api("GET", `/features/feature-segments/?environment=${env.id}&feature=${feature}`)
    ).results.find((fs) => fs.segment === segment.id);
    const featureSegment =
      existing ?? (await api("POST", "/features/feature-segments/", { feature, segment: segment.id, environment: env.id }));
    // Segment overrides live only under /features/featurestates/, which wants the typed value object.
    const states = await api("GET", `/features/featurestates/?feature=${feature}&environment=${env.id}`);
    const override = (states.results ?? states).find((s) => s.feature_segment === featureSegment.id);
    const body = {
      enabled: true,
      feature_state_value: { type: "unicode", string_value: asValue(value) },
      feature,
      environment: env.id,
      feature_segment: featureSegment.id,
    };
    if (override) await api("PATCH", `/features/featurestates/${override.id}/`, body);
    else await api("POST", "/features/featurestates/", body);
  }
}

// Flagsmith refuses webhooks to private addresses, so this needs a public URL (e.g. a tunnel); skipped without one.
const webhooks = WEBHOOK_URL ? await api("GET", `/environments/${ENV_KEY}/webhooks/`) : [];
if (WEBHOOK_URL && !webhooks.some((w) => w.url === WEBHOOK_URL)) {
  await api("POST", `/environments/${ENV_KEY}/webhooks/`, { url: WEBHOOK_URL, enabled: true });
  console.log(`added webhook ${WEBHOOK_URL}`);
}

console.log("Flagsmith is set up for Pakka.");
