// Servicio de reservas conectado al Cal.com simulado, con reloj fijo.
const { createFakeCal } = require('./fake-cal.js');
const { createCalClient } = require('../../api/_lib/cal-client.js');
const { createBookingService } = require('../../api/_lib/booking-service.js');
const { createMemoryStore } = require('../../api/_lib/store.js');

// Lunes 2 de noviembre de 2026, 08:00 en Caracas
const NOW = Date.parse('2026-11-02T12:00:00Z');

// Dos paquetes con eventos y duraciones distintas (mismo anfitrión y calendario)
const EVENTS = {
  'embarazo/estudio': { eventTypeId: 101, durationMinutes: 120 },
  'quince-anos/recepcion': { eventTypeId: 202, durationMinutes: 180 },
};

const silent = { warn() {}, error() {}, log() {} };

// Todos los paquetes del catálogo en un evento de 120 min, como en producción (BR-05)
const ALL_120 = Object.fromEntries(Object.keys(require('../../api/_lib/cal-events.js')).map((k) => [k, { eventTypeId: 101, durationMinutes: 120 }]));

// store: almacén compartido; pasar el mismo a varios setup simula varias instancias de Vercel.
// instance(): otra instancia del servicio sobre el mismo Cal.com simulado y el mismo almacén.
function setup({ now = NOW, events = EVENTS, pageSize, store = createMemoryStore(), enforce, latencyMs, service: opts = {} } = {}) {
  let clock = now;
  const fake = createFakeCal({ events: { 101: { duration: 120 }, 202: { duration: 180 } }, now: () => clock, pageSize, enforce, latencyMs });
  const cal = createCalClient({ apiKey: fake.apiKey, baseUrl: 'https://cal.test', fetchImpl: fake.fetch, timeoutMs: 1000 });
  const instance = () => createBookingService({ cal, events, now: () => clock, log: silent, store, ...opts });
  return { fake, cal, store, service: instance(), instance, advance: (ms) => { clock += ms; }, now: () => clock };
}

// Solicitud válida para Embarazo · Estudio (US$80, abono US$40)
const request = (over = {}) => ({
  referencia: 'ref-0000000000000001',
  servicio: 'embarazo', paquete: 'estudio', precio: 80, abono: 40,
  fecha: '2026-11-04', hora: '08:00', zonaHoraria: 'America/Caracas',
  nombre: 'María Pérez', whatsapp: '+584121234567',
  detalles: { 'Semanas de embarazo': 30, Vestuario: 'Ambos' },
  ...over,
});

// Solicitud Newborn válida (bebé nacido el 10/10/2026; sesión el 04/11/2026)
const newbornRequest = (over = {}) => request({
  referencia: 'ref-newborn-00000001', servicio: 'newborn', paquete: 'sesion-newborn', precio: 80, abono: 40, bebes: 1,
  nacio: 'Sí', nacimiento: '2026-10-10', detalles: { 'Cantidad de bebés': 1 }, ...over,
});

module.exports = { setup, request, newbornRequest, NOW, EVENTS, ALL_120, silent };
