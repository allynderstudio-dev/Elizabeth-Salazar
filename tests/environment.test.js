// Entorno de prueba aislado (DEV-P0-01): fuera de producción nunca se escribe en el evento de Ely.
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEnvironment } = require('../api/_lib/environment.js');
const CAL_EVENTS = require('../api/_lib/cal-events.js');
const { createCalClient } = require('../api/_lib/cal-client.js');
const { setup, request } = require('./helpers/setup.js');

test('T-ENV-01: producción usa el evento real de Ely; ninguna variable de prueba lo cambia', () => {
  const e = resolveEnvironment({ VERCEL_ENV: 'production', CAL_API_KEY: 'k', CAL_TEST_EVENT_TYPE_ID: '999', CAL_TEST_API_KEY: 't' });
  assert.equal(e.mode, 'production');
  assert.equal(e.events, CAL_EVENTS);
  assert.ok(Object.values(e.events).every((x) => x.eventTypeId === 7652774));
  assert.equal(e.apiKey, 'k');
});

test('T-ENV-02: fuera de producción sin cuenta de prueba → solo lectura; crear se rechaza sin llamar a Cal.com', async () => {
  for (const env of [{}, { VERCEL_ENV: 'preview', CAL_API_KEY: 'k' }, { VERCEL_ENV: 'development', CAL_TEST_EVENT_TYPE_ID: '7652774', CAL_TEST_API_KEY: 't' },
    { CAL_TEST_EVENT_TYPE_ID: '7600420', CAL_TEST_API_KEY: 't' }, { CAL_TEST_EVENT_TYPE_ID: '999' }]) {
    const e = resolveEnvironment(env);
    assert.equal(e.mode, 'read-only', JSON.stringify(env));
    assert.equal(e.canWrite, false);
  }
  const { service, fake } = setup({ service: { canWrite: false } });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'not_reservable');
  assert.deepEqual(await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }), { reservable: false });
  assert.equal(fake.calls.length, 0);

  // Segunda barrera: el cliente de Cal.com tampoco escribe
  let calls = 0;
  const cal = createCalClient({ apiKey: 'k', fetchImpl: async () => { calls += 1; }, allowWrites: false });
  await assert.rejects(cal.createBooking({}), (err) => err.kind === 'auth');
  assert.equal(calls, 0);
});

test('producción sin almacén compartido → modo WhatsApp (no puede garantizar que no haya duplicados)', async () => {
  const { service, fake } = setup({ store: null });
  assert.deepEqual(await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }), { reservable: false });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'not_reservable');
  assert.equal(fake.calls.length, 0);
});

test('T-ENV-03: con cuenta de prueba aislada, todos los paquetes usan el evento de prueba (120 min)', () => {
  const e = resolveEnvironment({ VERCEL_ENV: 'preview', CAL_TEST_EVENT_TYPE_ID: '123456', CAL_TEST_API_KEY: 't', CAL_API_KEY: 'k' });
  assert.equal(e.mode, 'test');
  assert.equal(e.apiKey, 't');
  assert.deepEqual(Object.keys(e.events).sort(), Object.keys(CAL_EVENTS).sort());
  assert.ok(Object.values(e.events).every((x) => x.eventTypeId === 123456 && x.durationMinutes === 120));
});
