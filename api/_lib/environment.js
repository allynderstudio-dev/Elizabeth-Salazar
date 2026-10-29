// Entorno de reservas: decide qué evento de Cal.com usa el sitio y si puede escribir en él.
//   production  VERCEL_ENV=production: eventos reales de Ely (api/_lib/cal-events.js), con CAL_API_KEY.
//   test        fuera de producción, con CAL_TEST_EVENT_TYPE_ID y CAL_TEST_API_KEY de una cuenta
//               de Cal.com AISLADA (no conectada al calendario de Ely): todos los paquetes usan ese evento.
//   read-only   cualquier otro caso (npm run dev, Preview sin cuenta de prueba): no se crean reservas
//               y la disponibilidad responde "reservable: false" (el sitio pasa a modo WhatsApp).
// Fuera de producción nunca se escribe en un evento de la cuenta de Ely.
const CAL_EVENTS = require('./cal-events.js');

// Eventos de la cuenta de Ely. 7600420 es el antiguo evento de prueba: está en su cuenta y
// escribe en su Google Calendar, así que tampoco sirve como entorno de prueba.
const ELY_EVENT_IDS = new Set([...Object.values(CAL_EVENTS).map((e) => e.eventTypeId), 7600420]);
const TEST_DURATION_MINUTES = 120; // bloques fijos de 2 h, también en pruebas

function resolveEnvironment(env = process.env) {
  if (env.VERCEL_ENV === 'production') {
    return { mode: 'production', events: CAL_EVENTS, canWrite: true, apiKey: env.CAL_API_KEY };
  }
  const id = Number(env.CAL_TEST_EVENT_TYPE_ID);
  if (Number.isInteger(id) && id > 0 && !ELY_EVENT_IDS.has(id) && env.CAL_TEST_API_KEY) {
    const test = { eventTypeId: id, durationMinutes: TEST_DURATION_MINUTES };
    const events = Object.fromEntries(Object.keys(CAL_EVENTS).map((k) => [k, test]));
    return { mode: 'test', events, canWrite: true, apiKey: env.CAL_TEST_API_KEY };
  }
  return { mode: 'read-only', events: CAL_EVENTS, canWrite: false, apiKey: env.CAL_API_KEY };
}

module.exports = { resolveEnvironment, ELY_EVENT_IDS };
