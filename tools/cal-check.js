#!/usr/bin/env node
// Comprobación REAL y de solo lectura contra Cal.com. No crea, confirma ni rechaza reservas.
//   npm run cal:check                              eventos mapeados en api/_lib/cal-events.js
//   npm run cal:check -- --event 1234567 --duration 120   un evento aún sin mapear (p. ej. el de prueba)
// Usa CAL_API_KEY del entorno o de ~/.config/ely-reservas/env. Nunca imprime la clave.
const { loadSecrets } = require('./dev-server.js');
const { createCalClient } = require('../api/_lib/cal-client.js');
const { createBookingService } = require('../api/_lib/booking-service.js');
const CAL_EVENTS = require('../api/_lib/cal-events.js');

async function main() {
  loadSecrets();
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  let events = CAL_EVENTS;
  if (arg('--event')) {
    events = { 'prueba/sin-mapear': { eventTypeId: Number(arg('--event')), durationMinutes: Number(arg('--duration') || 120) } };
  }
  const entries = Object.entries(events);
  if (!entries.length) {
    console.log('No hay paquetes mapeados. Usa --event <id> --duration <min> para revisar el evento de prueba.');
    return;
  }

  const cal = createCalClient({ apiKey: process.env.CAL_API_KEY, baseUrl: process.env.CAL_API_BASE || undefined });
  const svc = createBookingService({ cal, events, log: { warn() {}, error() {} } });
  const from = svc.minDate();
  const to = (() => { const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 13); return d.toISOString().slice(0, 10); })();

  for (const [key, ev] of entries) {
    console.log(`\n${key} → evento ${ev.eventTypeId} (${ev.durationMinutes} min)`);
    try {
      const startUtc = new Date(`${from}T04:00:00Z`).toISOString();
      const endUtc = new Date(`${to}T23:59:59-04:00`).toISOString();
      const raw = await cal.getSlots({ eventTypeId: ev.eventTypeId, startUtc, endUtc, timeZone: 'America/Caracas' });
      const days = Object.keys(raw).sort();
      console.log(`  /v2/slots: ${days.length} días con horarios entre ${from} y ${to} (hora de Caracas)`);
      days.slice(0, 6).forEach((d) => console.log(`    ${d}: ${raw[d].map((s) => `${s.start.slice(11, 16)}–${(s.end || '').slice(11, 16)}`).join(', ')}`));
      const pending = await cal.listBookings({ eventTypeId: ev.eventTypeId, status: 'unconfirmed' });
      console.log(`  Solicitudes pendientes (unconfirmed): ${pending.length}`);
      pending.slice(0, 5).forEach((b) => console.log(`    ${b.uid} · ${b.start} · ${b.status} · origen=${(b.metadata || {}).origen || '-'}`));
    } catch (err) {
      console.log(`  ERROR ${err.kind || ''} ${err.status || ''}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main();
