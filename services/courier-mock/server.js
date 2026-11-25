// Simulated courier for the Pakka demo. Everything here is fictional.
import http from 'node:http';
import { randomInt } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const COURIER_ID = process.env.COURIER_ID || 'swiftship';
const COURIER_NAME = process.env.COURIER_NAME || COURIER_ID;
const HUB = process.env.HUB || 'Bengaluru hub';
const PORT = Number(process.env.PORT || 8080);
// The jam survives container restarts (an emptyDir in k8s), so a jammed hub keeps crashing and ends in
// CrashLoopBackOff, which NudgeBee detects. Unset locally: the jam is in memory only and nothing crashes.
const JAM_FILE = process.env.JAM_FILE;

let jammed = Boolean(JAM_FILE && existsSync(JAM_FILE));
let crashTimer = null;

// A jammed hub's sortation service falls over: with a persisted jam it exits with an error a few seconds after the
// jam starts (and after each restart), so Kubernetes reports a real crash loop.
function armCrash() {
  clearTimeout(crashTimer);
  crashTimer = null;
  if (!jammed || !JAM_FILE) return;
  crashTimer = setTimeout(() => {
    log({ level: 'error', event: 'hub_crash', msg: `sortation service crashed: backlog at ${HUB} (simulated)` });
    process.exit(1);
  }, Number(process.env.JAM_CRASH_MS || 4000));
}
armCrash();
let shipmentSeq = 0;

const log = (fields) => console.log(JSON.stringify({ at: new Date().toISOString(), courier: COURIER_ID, ...fields }));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ...body, courier: COURIER_ID, simulated: true }));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// When jammed, the business endpoints are slow and fail about 40% of the time.
async function jamGate(res) {
  if (!jammed) return false;
  await sleep(randomInt(2000, 4001));
  if (Math.random() < 0.4) {
    send(res, 503, { error: 'hub_jammed', detail: `sortation backlog at ${HUB}` });
    return true;
  }
  return false;
}

function etaDays(pincode) {
  const p = String(pincode || '');
  if (/^5[6-9]/.test(p)) return 2;
  if (/^[34]/.test(p)) return 3;
  return 4;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = `${req.method} ${url.pathname}`;

  switch (route) {
    case 'GET /healthz':
      if (jammed) return send(res, 503, { status: 'jammed', hub: HUB });
      return send(res, 200, { status: 'ok', hub: HUB });

    case 'GET /quote': {
      if (await jamGate(res)) return;
      const pincode = url.searchParams.get('pincode');
      if (!pincode) return send(res, 400, { error: 'pincode is required' });
      return send(res, 200, { pincode, eta_days: etaDays(pincode) + (jammed ? 2 : 0), name: COURIER_NAME, hub: HUB });
    }

    case 'POST /shipments': {
      const body = await readJson(req);
      if (body === null) return send(res, 400, { error: 'invalid JSON' });
      if (await jamGate(res)) return;
      shipmentSeq += 1;
      const awb = `${COURIER_ID.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-7)}${String(shipmentSeq).padStart(3, '0')}`;
      return send(res, 201, { awb, order_id: body.order_id ?? null });
    }

    case 'POST /chaos': {
      const body = await readJson(req);
      if (body === null || typeof body.on !== 'boolean') return send(res, 400, { error: 'body must be {"on": boolean}' });
      if (body.on !== jammed) {
        jammed = body.on;
        if (JAM_FILE) jammed ? writeFileSync(JAM_FILE, '') : rmSync(JAM_FILE, { force: true });
        armCrash();
        log(
          jammed
            ? { level: 'error', event: 'jam_on', msg: `HUB JAMMED: sortation backlog at ${HUB} (simulated)` }
            : { level: 'info', event: 'jam_off', msg: `HUB RECOVERED: ${HUB} sortation backlog cleared (simulated)` },
        );
      }
      return send(res, 200, { on: jammed, hub: HUB });
    }

    default:
      return send(res, 404, { error: 'not found' });
  }
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const wasJammed = jammed;
  res.on('finish', () => {
    log({
      level: res.statusCode >= 500 ? 'error' : 'info',
      method: req.method,
      path: req.url.split('?')[0],
      status: res.statusCode,
      ms: Date.now() - started,
      jammed: wasJammed || jammed,
    });
  });
  try {
    await handle(req, res);
  } catch (err) {
    log({ level: 'error', event: 'handler_error', msg: err.message });
    if (!res.headersSent) send(res, 500, { error: 'internal' });
  }
});

server.listen(PORT, () => log({ level: 'info', event: 'listening', msg: `${COURIER_NAME} (${HUB}) on :${PORT}`, port: PORT, jammed }));

// A jammed hub that is stopped (e.g. by the liveness probe) did not drain, so it exits with an error too.
const shutdown = () => server.close(() => process.exit(jammed && JAM_FILE ? 1 : 0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
