const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, request } = require('./helpers/setup.js');

test('devuelve solo los horarios libres de Cal.com, en hora de Caracas', async () => {
  const { service, fake } = setup();
  const out = await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' });
  assert.equal(out.reservable, true);
  assert.equal(out.duracionMinutos, 120);
  assert.deepEqual(out.dias['2026-11-04'], ['08:00', '10:00', '14:00', '16:00']);
  // Hoy (2 nov) no se ofrece: mínimo un día de anticipación; domingos nunca
  assert.equal(out.dias['2026-11-02'], undefined);
  assert.equal(out.dias['2026-11-08'], undefined);
  // El mes se pide como instantes UTC de los límites del mes en Caracas
  const call = fake.calls.find((c) => c.path === '/v2/slots');
  assert.equal(call.query.eventTypeId, '101');
  assert.equal(call.query.start, '2026-11-01T04:00:00.000Z');
  assert.equal(call.query.end, '2026-12-01T03:59:59.999Z');
});

test('una solicitud pendiente bloquea su horario', async () => {
  const { service } = setup();
  await service.createBooking(request({ hora: '10:00' }));
  const out = await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' });
  assert.deepEqual(out.dias['2026-11-04'], ['08:00', '14:00', '16:00']);
});

test('solapamiento entre paquetes de distinta duración', async () => {
  const { service } = setup();
  // Embarazo (120 min) a las 10:00 → Recepción (180 min) no puede empezar a las 08:00 (08–11)
  await service.createBooking(request({ hora: '10:00' }));
  const out = await service.getAvailability({ servicio: 'quince-anos', paquete: 'recepcion', mes: '2026-11' });
  assert.deepEqual(out.dias['2026-11-04'], ['14:00', '16:00']);
});

test('paquete sin evento de Cal.com: reservable=false y sin llamadas a la API', async () => {
  const { service, fake } = setup();
  const out = await service.getAvailability({ servicio: 'newborn', paquete: 'sesion-newborn', mes: '2026-11' });
  assert.deepEqual(out, { reservable: false });
  assert.equal(fake.calls.length, 0);
});

test('fallo de Cal.com: error, nunca disponibilidad inventada', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'GET', path: /\/v2\/slots/, kind: 500 });
  await assert.rejects(service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }), (err) => err.kind === 'server');
  fake.inject({ method: 'GET', path: /\/v2\/slots/, kind: 'network' });
  await assert.rejects(service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }), (err) => err.kind === 'network');
});

test('duración distinta a la del mapeo: se rechaza (mapeo mal configurado)', async () => {
  const { service } = setup({ events: { 'embarazo/estudio': { eventTypeId: 101, durationMinutes: 90 } } });
  await assert.rejects(service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' }), /Duración 120 min/);
});

test('mes fuera de rango o inválido', async () => {
  const { service, fake } = setup();
  assert.deepEqual((await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-10' })).dias, {});
  assert.deepEqual((await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2027-06' })).dias, {});
  assert.equal(fake.calls.length, 0);
  await assert.rejects(service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: 'noviembre' }), (err) => err.code === 'invalid');
  await assert.rejects(service.getAvailability({ servicio: 'embarazo', paquete: 'no-existe', mes: '2026-11' }), (err) => err.code === 'invalid');
});
