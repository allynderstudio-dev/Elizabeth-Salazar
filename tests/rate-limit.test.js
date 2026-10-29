// Protección contra envíos abusivos (BR-13, DEV-P1-04)
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../tools/dev-server.js');
const bookings = require('../api/bookings.js');
const { createRateLimiter } = require('../api/_lib/rate-limit.js');
const { setup, request } = require('./helpers/setup.js');

async function start(service, limits) {
  const server = createServer({ '/api/bookings': bookings.createHandler(() => service, () => createRateLimiter({ store: service.store || setup().store, limits })) });
  await new Promise((r) => server.listen(0, r));
  return { base: `http://localhost:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
const post = (base, body, ip = '203.0.113.7') =>
  fetch(`${base}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(body) });
const LIMITS = { attempts: { max: 6, windowMs: 600e3 }, newRequests: { max: 3, windowMs: 86400e3 } };

test('T-RL-01: una ráfaga desde una IP se limita antes de llegar a Cal.com (429 + Retry-After)', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service, LIMITS);
  t.after(srv.close);
  const statuses = [];
  for (let i = 0; i < 10; i += 1) {
    const res = await post(srv.base, request({ referencia: `ref-rafaga-${String(i).padStart(8, '0')}`, hora: '10:00', fecha: `2026-11-${String(4 + (i % 3)).padStart(2, '0')}` }));
    statuses.push(res.status);
    if (res.status === 429) {
      assert.deepEqual(await res.json(), { error: 'rate_limited' });
      assert.ok(Number(res.headers.get('retry-after')) > 0);
    }
  }
  assert.ok(statuses.includes(429));
  assert.ok(fake.bookings.length <= 3);
  // Otra IP no se ve afectada
  assert.notEqual((await post(srv.base, request({ referencia: 'ref-otra-ip-0000001', hora: '14:00' }), '198.51.100.9')).status, 429);
});

test('T-RL-02: un cliente normal (envío, reintento con la misma referencia, otra reserva después) no se limita', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service, LIMITS);
  t.after(srv.close);
  assert.equal((await post(srv.base, request())).status, 201);
  assert.equal((await post(srv.base, request())).status, 200);
  assert.equal((await post(srv.base, request())).status, 200);
  assert.equal((await post(srv.base, request({ referencia: 'ref-segunda-sesion-1', hora: '14:00' }))).status, 201);
  assert.equal(fake.bookings.length, 2);
});

test('campo trampa lleno → rechazado sin llegar a Cal.com', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service, LIMITS);
  t.after(srv.close);
  assert.equal((await post(srv.base, request({ sitio: 'http://spam.example' }))).status, 400);
  assert.equal(fake.calls.length, 0);
});
