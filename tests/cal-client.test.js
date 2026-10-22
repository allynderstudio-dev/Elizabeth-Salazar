const test = require('node:test');
const assert = require('node:assert/strict');
const { createCalClient, CalApiError } = require('../api/_lib/cal-client.js');
const { setup } = require('./helpers/setup.js');

const respond = (status, body) => async () => new Response(JSON.stringify(body), { status });

test('envía la clave como Bearer y la versión documentada de cada endpoint', async () => {
  const { fake, cal } = setup();
  await cal.getSlots({ eventTypeId: 101, startUtc: '2026-11-04T04:00:00.000Z', endUtc: '2026-11-05T03:59:59.999Z', timeZone: 'America/Caracas' });
  await cal.listBookings({ eventTypeId: 101 });
  const [slots, list] = fake.calls;
  assert.equal(slots.headers.Authorization, 'Bearer cal_test_key');
  assert.equal(slots.headers['cal-api-version'], '2024-09-04');
  assert.equal(slots.query.format, 'range');
  assert.equal(slots.query.timeZone, 'America/Caracas');
  assert.equal(list.headers['cal-api-version'], '2026-05-01');
});

test('clasifica los errores de Cal.com', async () => {
  const kind = async (fetchImpl) => {
    const cal = createCalClient({ apiKey: 'cal_x', fetchImpl });
    try { await cal.createBooking({}); } catch (err) { assert.ok(err instanceof CalApiError); return [err.kind, err.uncertain]; }
    throw new Error('no falló');
  };
  assert.deepEqual(await kind(respond(400, { status: 'error', error: { message: 'User either already has booking at this time or is not available' } })), ['conflict', false]);
  assert.deepEqual(await kind(respond(409, { status: 'error' })), ['conflict', false]);
  assert.deepEqual(await kind(respond(400, { status: 'error', error: { message: 'attendee.name must be a string' } })), ['rejected', false]);
  assert.deepEqual(await kind(respond(401, { status: 'error' })), ['auth', false]);
  assert.deepEqual(await kind(respond(429, { status: 'error' })), ['rate', false]);
  assert.deepEqual(await kind(respond(502, null)), ['server', true]);
  assert.deepEqual(await kind(async () => { throw new TypeError('fetch failed'); }), ['network', true]);
  assert.deepEqual(await kind(respond(201, { ok: true })), ['invalid', false]);
});

test('sin CAL_API_KEY falla al usarse, no al construirse', async () => {
  const cal = createCalClient({ apiKey: '', fetchImpl: () => { throw new Error('no debe llamarse'); } });
  await assert.rejects(cal.getBooking('x'), (err) => err.kind === 'auth');
});

test('recorre todas las páginas de la lista de reservas', async () => {
  const { service, cal } = setup({ pageSize: 2 });
  const { request } = require('./helpers/setup.js');
  for (const [i, hora] of ['08:00', '10:00', '14:00', '16:00'].entries()) {
    await service.createBooking(request({ referencia: `ref-pagina-000000${i}`, hora }));
  }
  const all = await cal.listBookings({ eventTypeId: 101 });
  assert.equal(all.length, 4);
});
