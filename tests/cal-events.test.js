const test = require('node:test');
const assert = require('node:assert/strict');
const CAL_EVENTS = require('../api/_lib/cal-events.js');
const { SERVICES } = require('../js/booking-data.js');

const catalog = SERVICES.flatMap((s) => s.packages.map((p) => `${s.slug}/${p.slug}`));

test('mapa de Cal.com: cada paquete del catálogo está conectado explícitamente', () => {
  assert.deepEqual(Object.keys(CAL_EVENTS).sort(), [...catalog].sort());
});

test('mapa de Cal.com: entradas válidas', () => {
  Object.entries(CAL_EVENTS).forEach(([key, ev]) => {
    assert.ok(Number.isInteger(ev.eventTypeId) && ev.eventTypeId > 0, key);
    assert.ok(Number.isInteger(ev.durationMinutes) && ev.durationMinutes > 0, key);
  });
});
