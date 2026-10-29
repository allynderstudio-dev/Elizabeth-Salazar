// Sin dobles reservas entre instancias (BR-06, DEV-P0-02). Cal.com simulado con enforce:false:
// NO rechaza choques ni descuenta reservas de /v2/slots, así lo único que evita duplicados es el sitio.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, request, newbornRequest, ALL_120 } = require('./helpers/setup.js');
const { LOCK } = require('../api/_lib/booking-service.js');

const active = (fake) => fake.bookings.filter((b) => b.status === 'pending' || b.status === 'accepted');
const settle = (ps) => Promise.allSettled(ps);
const codes = (rs) => rs.map((r) => (r.status === 'fulfilled' ? 'ok' : r.reason.code)).sort();

test('T-DB-01: dos clientes ven y eligen el mismo horario (elegir no reserva nada)', async () => {
  const { instance } = setup({ events: ALL_120, enforce: false });
  const [a, b] = [instance(), instance()];
  const da = await a.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' });
  const db = await b.getAvailability({ servicio: 'newborn', paquete: 'sesion-newborn', mes: '2026-11' });
  assert.ok(da.dias['2026-11-20'].includes('10:00'));
  assert.ok(db.dias['2026-11-20'].includes('10:00'));
});

test('T-DB-02: Embarazo 10:00 y Newborn 10:00 a la vez en instancias distintas → una sola reserva', async () => {
  const { instance, fake } = setup({ events: ALL_120, enforce: false, latencyMs: 5 });
  const rs = await settle([
    instance().createBooking(request({ referencia: 'ref-embarazo-0000001', hora: '10:00', fecha: '2026-11-20' })),
    instance().createBooking(newbornRequest({ referencia: 'ref-newborn-00000002', hora: '10:00', fecha: '2026-11-20' })),
  ]);
  assert.deepEqual(codes(rs), ['ok', 'slot_taken']);
  assert.equal(active(fake).length, 1);
});

test('T-DB-03: muchas solicitudes en paralelo por el mismo horario → exactamente una', async () => {
  const { instance, fake } = setup({ events: ALL_120, enforce: false, latencyMs: 2 });
  const rs = await settle(Array.from({ length: 12 }, (_, i) =>
    instance().createBooking(request({ referencia: `ref-paralelo-${String(i).padStart(6, '0')}`, hora: '10:00', fecha: '2026-11-20' }))));
  assert.equal(rs.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(rs.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'slot_taken'));
  assert.equal(active(fake).length, 1);
});

test('T-DB-04/05: una reserva pendiente o aceptada bloquea el horario para cualquier servicio', async () => {
  const { service, fake } = setup({ events: ALL_120, enforce: false });
  const a = await service.createBooking(request({ referencia: 'ref-pendiente-000001', hora: '10:00', fecha: '2026-11-20' }));
  const familiar = (ref) => request({ referencia: ref, servicio: 'familiar', paquete: 'sesion-familiar', precio: 80, abono: 40, hora: '10:00', fecha: '2026-11-20' });
  await assert.rejects(service.createBooking(familiar('ref-familiar-0000001')), (err) => err.code === 'slot_taken');
  fake.setStatus(a.uid, 'accepted');
  await assert.rejects(service.createBooking(familiar('ref-familiar-0000002')), (err) => err.code === 'slot_taken');
  assert.equal(active(fake).length, 1);
});

test('T-DB-06: rechazada o cancelada libera el horario', async () => {
  const { service, fake } = setup({ events: ALL_120 });
  const a = await service.createBooking(request({ referencia: 'ref-rechazada-00001', hora: '10:00', fecha: '2026-11-20' }));
  fake.setStatus(a.uid, 'rejected');
  const b = await service.createBooking(request({ referencia: 'ref-tras-rechazo-001', hora: '10:00', fecha: '2026-11-20' }));
  fake.setStatus(b.uid, 'cancelled');
  await service.createBooking(request({ referencia: 'ref-tras-cancel-0001', hora: '10:00', fecha: '2026-11-20' }));
  assert.equal(active(fake).length, 1);
});

test('T-DB-07/08: bloques contiguos permitidos; una Recepción a las 14:00 no bloquea las 16:00 (bloques fijos de 2 h)', async () => {
  const { service, fake } = setup({ events: ALL_120, enforce: false });
  await service.createBooking(request({ referencia: 'ref-contiguo-000001', hora: '08:00', fecha: '2026-11-20' }));
  await service.createBooking(request({ referencia: 'ref-contiguo-000002', hora: '10:00', fecha: '2026-11-20' }));
  await service.createBooking(request({ referencia: 'ref-recepcion-00001', servicio: 'recepciones', paquete: 'recepcion', precio: 380, abono: 190, hora: '14:00', fecha: '2026-11-20', detalles: {} }));
  const d = await service.getAvailability({ servicio: 'familiar', paquete: 'sesion-familiar', mes: '2026-11' });
  assert.ok(d.dias['2026-11-20'].includes('16:00'));
  await service.createBooking(request({ referencia: 'ref-familiar-160001', servicio: 'familiar', paquete: 'sesion-familiar', precio: 80, abono: 40, hora: '16:00', fecha: '2026-11-20' }));
  assert.equal(active(fake).length, 4);
  assert.ok(fake.bookings.every((b) => b.duration === 120));
});

test('T-DB-09: un bloqueo de una instancia caída caduca y la siguiente solicitud continúa', async () => {
  const { service, store, fake } = setup({ events: ALL_120, service: { lock: { ...LOCK, ttlMs: 150, waitMs: 2000 } } });
  await store.setNx('ely-reservas:lock:2026-11-20', 'instancia-caida', 150);
  const out = await service.createBooking(request({ referencia: 'ref-tras-caida-0001', hora: '10:00', fecha: '2026-11-20' }));
  assert.equal(out.estado, 'pendiente');
  assert.equal(fake.bookings.length, 1);
});

test('T-DB-10: sin poder completar con seguridad → "busy" (reintentable), nunca éxito; el reintento crea una vez', async () => {
  const { service, store, fake } = setup({ events: ALL_120, service: { lock: { ...LOCK, waitMs: 100 } } });
  await store.setNx('ely-reservas:lock:2026-11-20', 'otra-instancia', 60000);
  const body = request({ referencia: 'ref-contencion-0001', hora: '10:00', fecha: '2026-11-20' });
  await assert.rejects(service.createBooking(body), (err) => err.code === 'busy');
  assert.equal(fake.calls.filter((c) => c.method === 'POST').length, 0);
  await store.delIfEquals('ely-reservas:lock:2026-11-20', 'otra-instancia');
  await service.createBooking(body);
  await service.createBooking(body);
  assert.equal(fake.bookings.length, 1);
});

test('almacén caído → "busy", sin llamar a Cal.com para crear', async () => {
  const broken = { kind: 'memory', setNx: async () => { throw new Error('caído'); }, delIfEquals: async () => true, expireIfEquals: async () => true, incr: async () => 1 };
  const { service, fake } = setup({ events: ALL_120, store: broken });
  await assert.rejects(service.createBooking(request({ hora: '10:00', fecha: '2026-11-20' })), (err) => err.code === 'busy');
  assert.equal(fake.calls.filter((c) => c.method === 'POST').length, 0);
});

test('T-DB-11: la misma referencia reintentada a la vez en dos instancias → un solo uid', async () => {
  const { instance, fake } = setup({ events: ALL_120, enforce: false, latencyMs: 3 });
  const body = request({ referencia: 'ref-misma-ref-00001', hora: '10:00', fecha: '2026-11-20' });
  const [a, b] = await Promise.all([instance().createBooking(body), instance().createBooking(body)]);
  assert.equal(a.uid, b.uid);
  assert.equal(fake.bookings.length, 1);
});

test('bloqueo manual en el calendario conectado (BR-16): Cal.com deja de ofrecerlo y no se reserva', async () => {
  const { service, fake } = setup({ events: ALL_120 });
  fake.calendarBusy.push({ start: '2026-11-20T20:00:00Z', end: '2026-11-20T21:00:00Z' }); // 16:00–17:00 Caracas
  for (const [servicio, paquete] of [['embarazo', 'estudio'], ['familiar', 'sesion-familiar']]) {
    const d = await service.getAvailability({ servicio, paquete, mes: '2026-11' });
    assert.deepEqual(d.dias['2026-11-20'], ['08:00', '10:00', '14:00']);
  }
  await assert.rejects(service.createBooking(request({ hora: '16:00', fecha: '2026-11-20' })), (err) => err.code === 'slot_taken');
  fake.calendarBusy.length = 0;
  const d = await service.getAvailability({ servicio: 'embarazo', paquete: 'estudio', mes: '2026-11' });
  assert.deepEqual(d.dias['2026-11-20'], ['08:00', '10:00', '14:00', '16:00']);
});
