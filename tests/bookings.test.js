const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, request } = require('./helpers/setup.js');

const posts = (fake) => fake.calls.filter((c) => c.method === 'POST' && c.path === '/v2/bookings');

test('crea una solicitud pendiente sin correo, con datos propios en metadata', async () => {
  const { service, fake } = setup();
  const out = await service.createBooking(request());
  assert.equal(out.estado, 'pendiente');
  assert.equal(out.reutilizada, false);
  assert.match(out.uid, /^uid0001/);
  assert.equal(out.referencia, out.uid);

  const body = posts(fake)[0].body;
  assert.equal(body.start, '2026-11-04T12:00:00.000Z'); // 08:00 Caracas
  assert.equal(body.eventTypeId, 101);
  assert.equal('email' in body.attendee, false);
  assert.deepEqual(body.attendee, { name: 'María Pérez', timeZone: 'America/Caracas', phoneNumber: '+584121234567', language: 'es' });
  assert.equal(body.metadata.ref, 'ref-0000000000000001');
  assert.equal(body.metadata.precioUSD, '80');
  assert.equal(body.metadata.abonoUSD, '40');
  assert.equal('bebes' in body.metadata, false);
  assert.equal(body.metadata.creadaEn, '2026-11-02T12:00:00.000Z');
  assert.equal('venceEn' in body.metadata, false, 'sin vencimiento: las solicitudes no caducan');
  assert.ok(Object.keys(body.metadata).every((k) => k.length <= 40));
  assert.ok(Object.values(body.metadata).every((v) => typeof v === 'string' && v.length <= 500));

  // Se verifica el identificador real releyendo la reserva
  assert.ok(fake.calls.some((c) => c.method === 'GET' && c.path === `/v2/bookings/${out.uid}`));
  assert.equal(fake.bookings[0].status, 'pending');
});

test('envía a Cal.com un resumen del servicio en "Notas adicionales"', async () => {
  const { service, fake } = setup();
  await service.createBooking(request());
  const body = posts(fake)[0].body;
  assert.deepEqual(Object.keys(body.bookingFieldsResponses), ['notes']); // "servicio" desactivada por defecto
  assert.equal(body.bookingFieldsResponses.notes, [
    'Embarazo · Estudio — US$80 (abono del 50%: US$40)',
    'Semanas de embarazo: 30',
    'Vestuario: Ambos',
    'WhatsApp: +584121234567',
    'Solicitud enviada desde la página web.',
  ].join('\n'));
  assert.match(fake.bookings[0].bookingFieldsResponses.notes, /^Embarazo · Estudio/);
});

test('con la pregunta "servicio" configurada, también envía el servicio para el título', async () => {
  const { fake, cal } = setup();
  const { createBookingService } = require('../api/_lib/booking-service.js');
  const { EVENTS, NOW, silent } = require('./helpers/setup.js');
  const service = createBookingService({ cal, events: EVENTS, now: () => NOW, log: silent, fields: { notes: 'notes', service: 'servicio' } });
  await service.createBooking(request());
  assert.equal(posts(fake)[0].body.bookingFieldsResponses.servicio, 'Embarazo · Estudio');
});

test('Newborn: cada bebé adicional suma US$20 y el servidor lo valida', async () => {
  const { setup: _s, EVENTS } = require('./helpers/setup.js');
  const { service, fake } = _s({ events: { ...EVENTS, 'newborn/sesion-newborn': EVENTS['embarazo/estudio'] } });
  const newborn = (over) => request({ servicio: 'newborn', paquete: 'sesion-newborn', nacio: 'Sí', nacimiento: '2026-10-10', detalles: { 'Cantidad de bebés': 2 }, ...over });
  const code = async (over) => service.createBooking(newborn(over)).then(() => 'ok', (err) => `${err.code}:${err.field || ''}`);
  assert.equal(await code({ precio: 80, abono: 40 }), 'invalid:bebes'); // falta la cantidad
  assert.equal(await code({ precio: 80, abono: 40, bebes: 4 }), 'invalid:bebes'); // máximo 3
  assert.equal(await code({ precio: 80, abono: 40, bebes: '2' }), 'invalid:bebes');
  await assert.rejects(service.createBooking(newborn({ precio: 80, abono: 40, bebes: 2 })), (err) => err.code === 'price_changed' && err.precio === 100 && err.abono === 50);
  assert.equal(posts(fake).length, 0);

  const out = await service.createBooking(newborn({ precio: 100, abono: 50, bebes: 2 }));
  assert.equal(out.precio, 100);
  assert.equal(out.abono, 50);
  const body = posts(fake)[0].body;
  assert.equal(body.metadata.precioUSD, '100');
  assert.equal(body.metadata.abonoUSD, '50');
  assert.equal(body.metadata.bebes, '2');
  assert.equal(body.metadata.recargoUSD, '20');
  assert.match(body.bookingFieldsResponses.notes, /^Newborn · Sesión Newborn — US\$100 \(abono del 50%: US\$50\)\nBebés: 2 \(paquete US\$80 \+ bebé adicional US\$20\)\n/);
});

test('validación en el servidor', async () => {
  const { service, fake } = setup();
  const code = async (over) => service.createBooking(request(over)).then(() => 'ok', (err) => `${err.code}:${err.field || ''}`);
  assert.equal(await code({ whatsapp: '+5841212' }), 'invalid:whatsapp');
  assert.equal(await code({ whatsapp: '+14155550123' }), 'invalid:whatsapp');
  assert.equal(await code({ nombre: 'A' }), 'invalid:nombre');
  assert.equal(await code({ fecha: '2026-11-08' }), 'invalid:fecha'); // domingo
  assert.equal(await code({ fecha: '2026-11-02' }), 'invalid:fecha'); // hoy (sin anticipación)
  assert.equal(await code({ fecha: '2027-08-02' }), 'invalid:fecha'); // fuera de los 6 meses
  assert.equal(await code({ hora: '8am' }), 'invalid:hora');
  assert.equal(await code({ zonaHoraria: 'UTC' }), 'invalid:zonaHoraria');
  assert.equal(await code({ referencia: 'corta' }), 'invalid:referencia');
  assert.equal(await code({ detalles: { x: 'a'.repeat(501) } }), 'invalid:detalles');
  assert.equal(await code({ precio: 10, abono: 5 }), 'price_changed:');
  assert.equal(await code({ abono: 80 }), 'price_changed:');
  assert.equal(await code({ servicio: 'newborn', paquete: 'sesion-newborn', precio: 80, abono: 40, bebes: 1 }), 'not_reservable:');
  assert.equal(await code({ hora: '09:00' }), 'slot_taken:'); // Cal.com no ofrece ese horario
  assert.equal(posts(fake).length, 0, 'nada inválido llega a Cal.com');
});

test('reintento con la misma referencia: no duplica', async () => {
  const { service, fake } = setup();
  const a = await service.createBooking(request());
  const b = await service.createBooking(request());
  assert.equal(b.uid, a.uid);
  assert.equal(b.reutilizada, true);
  assert.equal(posts(fake).length, 1);
  assert.equal(fake.bookings.length, 1);
});

test('doble clic simultáneo: una sola reserva', async () => {
  const { service, fake } = setup();
  const [a, b] = await Promise.all([service.createBooking(request()), service.createBooking(request())]);
  assert.equal(a.uid, b.uid);
  assert.equal(fake.bookings.length, 1);
});

test('concurrencia entre instancias (sin memoria compartida): una sola reserva', async () => {
  const { fake, cal } = setup();
  const { createBookingService } = require('../api/_lib/booking-service.js');
  const { EVENTS, NOW, silent } = require('./helpers/setup.js');
  const s1 = createBookingService({ cal, events: EVENTS, now: () => NOW, log: silent });
  const s2 = createBookingService({ cal, events: EVENTS, now: () => NOW, log: silent });
  const [a, b] = await Promise.all([s1.createBooking(request()), s2.createBooking(request())]);
  assert.equal(a.uid, b.uid);
  assert.equal(fake.bookings.length, 1);
});

test('dos clientes por el mismo horario: uno gana y el otro recibe slot_taken', async () => {
  const { service, fake } = setup();
  const results = await Promise.allSettled([
    service.createBooking(request({ referencia: 'ref-cliente-a-000001' })),
    service.createBooking(request({ referencia: 'ref-cliente-b-000002', whatsapp: '+584149876543', nombre: 'Ana' })),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'slot_taken');
  assert.equal(fake.bookings.length, 1);
});

test('solapamiento entre paquetes al crear: Cal.com rechaza y se informa slot_taken', async () => {
  const { service, fake } = setup();
  await service.createBooking(request({ hora: '10:00' }));
  const quince = request({ referencia: 'ref-quince-00000001', servicio: 'quince-anos', paquete: 'recepcion', precio: 400, abono: 200, hora: '08:00', detalles: {} });
  await assert.rejects(service.createBooking(quince), (err) => err.code === 'slot_taken');
  assert.equal(fake.bookings.length, 1);
});

test('conflicto en el POST (otro reservó entre la consulta y la creación)', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'POST', path: /^\/v2\/bookings$/, kind: 409 });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'slot_taken');
});

test('respuesta perdida tras crear: se recupera la reserva existente sin duplicar', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'POST', path: /^\/v2\/bookings$/, kind: 'commit-then-network' });
  const out = await service.createBooking(request());
  assert.equal(out.reutilizada, true);
  assert.equal(fake.bookings.length, 1);
  assert.equal(out.uid, fake.bookings[0].uid);
});

test('fallo de red sin crear: "uncertain" y el reintento crea una sola vez', async () => {
  const { LOCK } = require('../api/_lib/booking-service.js');
  const { service, fake } = setup({ service: { lock: { ...LOCK, uncertainHoldMs: 50 } } });
  fake.inject({ method: 'POST', path: /^\/v2\/bookings$/, kind: 'network' });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'uncertain');
  assert.equal(fake.bookings.length, 0);
  const out = await service.createBooking(request());
  assert.equal(out.reutilizada, false);
  assert.equal(fake.bookings.length, 1);
});

test('5xx al crear y búsqueda posterior caída: "uncertain", nunca éxito', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'POST', path: /^\/v2\/bookings$/, kind: 503 });
  // Listas (cada búsqueda pide todas + pendientes): referencia antes del bloqueo, referencia y
  // solapamientos dentro; falla la búsqueda posterior
  fake.inject({ method: 'GET', path: /^\/v2\/bookings$/, kind: 'network', skip: 6 });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'uncertain');
});

test('Cal.com no responde antes de crear: error de lectura, nada creado', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'GET', path: /^\/v2\/bookings$/, kind: 'network' });
  await assert.rejects(service.createBooking(request()), (err) => err.kind === 'network');
  assert.equal(posts(fake).length, 0);
  assert.equal(fake.bookings.length, 0);
});

test('Cal.com devuelve otra cosa al releer: verification_failed, no éxito', async () => {
  const { service, fake } = setup();
  fake.inject({ method: 'GET', path: /^\/v2\/bookings\/[^/]+$/, kind: 'override', override: { start: '2026-11-04T14:00:00.000Z' } });
  await assert.rejects(service.createBooking(request()), (err) => err.code === 'verification_failed');
});

test('clave rechazada por Cal.com: error de autenticación, no éxito', async () => {
  const { fake } = setup();
  const { createCalClient } = require('../api/_lib/cal-client.js');
  const { createBookingService } = require('../api/_lib/booking-service.js');
  const { EVENTS, NOW, silent } = require('./helpers/setup.js');
  const cal = createCalClient({ apiKey: 'cal_revocada', baseUrl: 'https://cal.test', fetchImpl: fake.fetch });
  const service = createBookingService({ cal, events: EVENTS, now: () => NOW, log: silent });
  await assert.rejects(service.createBooking(request()), (err) => err.kind === 'auth');
});
