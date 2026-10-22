// Endpoints por HTTP real (servidor local de tools/dev-server.js) con Cal.com simulado.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../tools/dev-server.js');
const availability = require('../api/availability.js');
const bookings = require('../api/bookings.js');
const { setup, request } = require('./helpers/setup.js');

async function start(service) {
  const server = createServer({
    '/api/availability': availability.createHandler(() => service),
    '/api/bookings': bookings.createHandler(() => service),
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

const post = (base, body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(`${base}/api/bookings`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('flujo HTTP: disponibilidad → reserva → reintento → horario bloqueado', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service);
  t.after(srv.close);

  let res = await fetch(`${srv.base}/api/availability?servicio=embarazo&paquete=estudio&mes=2026-11`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await res.json()).dias['2026-11-04'], ['08:00', '10:00', '14:00', '16:00']);

  res = await post(srv.base, request());
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.estado, 'pendiente');

  res = await post(srv.base, request());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).uid, created.uid);
  assert.equal(fake.bookings.length, 1);

  res = await fetch(`${srv.base}/api/availability?servicio=embarazo&paquete=estudio&mes=2026-11`);
  assert.deepEqual((await res.json()).dias['2026-11-04'], ['10:00', '14:00', '16:00']);
});

test('errores HTTP sin filtrar detalles internos', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service);
  t.after(srv.close);

  assert.equal((await fetch(`${srv.base}/api/bookings`)).status, 405);
  assert.equal((await post(srv.base, request(), { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post(srv.base, '{malo')).status, 400);

  let res = await post(srv.base, request({ precio: 1 }));
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: 'price_changed', precio: 70, abono: 35 });

  res = await fetch(`${srv.base}/api/availability?servicio=newborn&paquete=sesion-newborn&mes=2026-11`);
  assert.deepEqual(await res.json(), { reservable: false });

  fake.inject({ method: 'GET', path: /\/v2\/slots/, kind: 500 });
  res = await fetch(`${srv.base}/api/availability?servicio=embarazo&paquete=estudio&mes=2026-11`);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.deepEqual(body, { error: 'unavailable' });

  fake.inject({ method: 'POST', path: /^\/v2\/bookings$/, kind: 'network' });
  res = await post(srv.base, request());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'uncertain' });
});

test('la clave de Cal.com nunca aparece en respuestas', async (t) => {
  const { service, fake } = setup();
  const srv = await start(service);
  t.after(srv.close);
  fake.inject({ method: 'GET', path: /\/v2\/slots/, kind: 401 });
  const res = await fetch(`${srv.base}/api/availability?servicio=embarazo&paquete=estudio&mes=2026-11`);
  const text = await res.text();
  assert.equal(res.status, 502);
  assert.ok(!text.includes(fake.apiKey));
});
