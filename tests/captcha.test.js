// CAPTCHA en el envío (BR-13, DEV-P1-07): Cloudflare Turnstile verificado en el servidor,
// antes del bloqueo y de cualquier llamada a Cal.com. Siteverify simulado con el
// comportamiento documentado de las claves de prueba.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../tools/dev-server.js');
const bookings = require('../api/bookings.js');
const { createCaptchaVerifier, ACTION } = require('../api/_lib/captcha.js');
const { setup, request } = require('./helpers/setup.js');

const PASS = '1x0000000000000000000000000000000AA';
const FAIL = '2x0000000000000000000000000000000AA';
const SPENT = '3x0000000000000000000000000000000AA';

// Siteverify simulado. Con una clave "real" ('live-secret') los tokens son de un solo uso.
function fakeSiteverify({ down = false } = {}) {
  const used = new Set();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = new URLSearchParams(init.body);
    calls.push(Object.fromEntries(body));
    if (down) throw new TypeError('fetch failed');
    const json = (o) => new Response(JSON.stringify(o), { status: 200 });
    const secret = body.get('secret');
    const token = body.get('response');
    if (secret === PASS) return json({ success: true, hostname: 'example.com', action: '', 'error-codes': [] });
    if (secret === FAIL) return json({ success: false, 'error-codes': ['invalid-input-response'] });
    if (secret === SPENT) return json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    if (used.has(token)) return json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    used.add(token);
    const [, host, action] = token.split('|');
    return json({ success: true, hostname: host, action, 'error-codes': [] });
  };
  return { fetchImpl, calls };
}

async function start({ secret, verifier = fakeSiteverify(), hostnames = ['elysalazarstudio.com'] } = {}) {
  const ctx = setup();
  const captcha = createCaptchaVerifier({ secret, hostnames, fetchImpl: verifier.fetchImpl, log: { error() {} } });
  const server = createServer({ '/api/bookings': bookings.createHandler(() => ctx.service, undefined, () => captcha) });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const post = (body) => fetch(`${base}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ...ctx, verifier, post, close: () => new Promise((r) => server.close(r)) };
}
const calCalls = (fake) => fake.calls.length;
const good = (n) => `tok${n}|elysalazarstudio.com|${ACTION}`;

test('T-CA-01: sin token → captcha_failed, sin bloqueo ni Cal.com', async (t) => {
  const s = await start({ secret: PASS });
  t.after(s.close);
  const res = await s.post(request());
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'captcha_failed' });
  assert.equal(calCalls(s.fake), 0);
  assert.equal(s.store.data.size, 0, 'no se tomó ningún bloqueo');
});

test('T-CA-02: clave que siempre falla → captcha_failed, nada creado', async (t) => {
  const s = await start({ secret: FAIL });
  t.after(s.close);
  const res = await s.post(request({ captcha: 'XXXX.DUMMY.TOKEN' }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'captcha_failed');
  assert.equal(calCalls(s.fake), 0);
});

test('T-CA-03: token ya usado o vencido → captcha_expired, nada creado', async (t) => {
  const s = await start({ secret: SPENT });
  t.after(s.close);
  const res = await s.post(request({ captcha: 'XXXX.DUMMY.TOKEN' }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'captcha_expired');
  assert.equal(calCalls(s.fake), 0);
});

test('T-CA-04: clave que siempre pasa → la reserva sigue normal (uid verificado)', async (t) => {
  const s = await start({ secret: PASS });
  t.after(s.close);
  const res = await s.post(request({ captcha: 'XXXX.DUMMY.TOKEN' }));
  assert.equal(res.status, 201);
  const out = await res.json();
  assert.equal(out.estado, 'pendiente');
  assert.equal(s.fake.bookings[0].uid, out.uid);
  assert.ok(s.verifier.calls[0].idempotency_key, 'se envía idempotency_key');
});

test('T-CA-05: reintento con la misma referencia y un token nuevo → una sola reserva', async (t) => {
  const s = await start({ secret: 'live-secret' });
  t.after(s.close);
  assert.equal((await s.post(request({ captcha: good(1) }))).status, 201);
  // El mismo token otra vez: rechazado por ser de un solo uso (el navegador nunca lo reutiliza)
  assert.equal((await (await s.post(request({ captcha: good(1) }))).json()).error, 'captcha_expired');
  const again = await s.post(request({ captcha: good(2) }));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).reutilizada, true);
  assert.equal(s.fake.bookings.length, 1);
});

test('Host o acción distintos con la clave real → captcha_failed', async (t) => {
  const s = await start({ secret: 'live-secret' });
  t.after(s.close);
  assert.equal((await (await s.post(request({ captcha: `a|otro-sitio.com|${ACTION}` }))).json()).error, 'captcha_failed');
  assert.equal((await (await s.post(request({ captcha: 'b|elysalazarstudio.com|login' }))).json()).error, 'captcha_failed');
  assert.equal(calCalls(s.fake), 0);
});

test('T-CA-06: Cloudflare no responde → falla cerrado (503 captcha_unavailable), sin reserva', async (t) => {
  const s = await start({ secret: 'live-secret', verifier: fakeSiteverify({ down: true }) });
  t.after(s.close);
  const res = await s.post(request({ captcha: good(3) }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'captcha_unavailable');
  assert.equal(s.verifier.calls.length, 2, 'un reintento con el mismo idempotency_key');
  assert.equal(s.verifier.calls[0].idempotency_key, s.verifier.calls[1].idempotency_key);
  assert.equal(calCalls(s.fake), 0);
});

test('T-CA-08: el campo trampa sigue antes de la verificación', async (t) => {
  const s = await start({ secret: PASS });
  t.after(s.close);
  const res = await s.post(request({ captcha: 'XXXX.DUMMY.TOKEN', sitio: 'https://spam.example' }));
  assert.equal(res.status, 400);
  assert.equal(s.verifier.calls.length, 0);
  assert.equal(calCalls(s.fake), 0);
});

test('sin clave secreta no se exige verificación (producción lo registra como incidente)', async () => {
  const v = createCaptchaVerifier({});
  assert.equal(v.enabled, false);
  assert.deepEqual(await v.verify(undefined), { omitida: true });
});

test('la disponibilidad entrega la clave de SITIO solo con las dos claves configuradas', async () => {
  const availability = require('../api/availability.js');
  const { captchaFromEnv } = require('../api/_lib/captcha.js');
  const { service } = setup();
  const res = { setHeader() {}, end(b) { this.body = JSON.parse(b); } };
  const req = { method: 'GET', query: { servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }, headers: {} };
  await availability.createHandler(() => service, console, () => captchaFromEnv({ TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET_KEY: PASS }))(req, res);
  assert.equal(res.body.turnstile, 'site');
  await availability.createHandler(() => service, console, () => captchaFromEnv({ TURNSTILE_SECRET_KEY: PASS }))(req, res);
  assert.equal(res.body.turnstile, undefined);
  assert.equal(captchaFromEnv({ TURNSTILE_SECRET_KEY: PASS }).enabled, false, 'sin clave de sitio no se exige token');
});
