// Servicio de reservas conectado al Cal.com simulado, con reloj fijo.
const { createFakeCal } = require('./fake-cal.js');
const { createCalClient } = require('../../api/_lib/cal-client.js');
const { createBookingService } = require('../../api/_lib/booking-service.js');

// Lunes 2 de noviembre de 2026, 08:00 en Caracas
const NOW = Date.parse('2026-11-02T12:00:00Z');

// Dos paquetes con eventos y duraciones distintas (mismo anfitrión y calendario)
const EVENTS = {
  'embarazo/estudio': { eventTypeId: 101, durationMinutes: 120 },
  'quince-anos/recepcion': { eventTypeId: 202, durationMinutes: 180 },
};

const silent = { warn() {}, error() {}, log() {} };

function setup({ now = NOW, events = EVENTS, pageSize } = {}) {
  let clock = now;
  const fake = createFakeCal({ events: { 101: { duration: 120 }, 202: { duration: 180 } }, now: () => clock, pageSize });
  const cal = createCalClient({ apiKey: fake.apiKey, baseUrl: 'https://cal.test', fetchImpl: fake.fetch, timeoutMs: 1000 });
  const service = createBookingService({ cal, events, now: () => clock, log: silent });
  return { fake, cal, service, advance: (ms) => { clock += ms; }, now: () => clock };
}

// Solicitud válida para Embarazo · Estudio (US$70, abono US$35)
const request = (over = {}) => ({
  referencia: 'ref-0000000000000001',
  servicio: 'embarazo', paquete: 'estudio', precio: 70, abono: 35,
  fecha: '2026-11-04', hora: '08:00', zonaHoraria: 'America/Caracas',
  nombre: 'María Pérez', whatsapp: '+584121234567',
  detalles: { 'Semanas de embarazo': 30, Vestuario: 'Ambos' },
  ...over,
});

module.exports = { setup, request, NOW, EVENTS, silent };
