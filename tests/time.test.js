const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../api/_lib/time.js');

const TZ = 'America/Caracas';

test('hora de Caracas → UTC (UTC−4)', () => {
  assert.equal(T.localToUtc('2026-11-04', '08:00', TZ).toISOString(), '2026-11-04T12:00:00.000Z');
  assert.equal(T.localToUtc('2026-11-04', '16:00', TZ).toISOString(), '2026-11-04T20:00:00.000Z');
  // Cambia de día en UTC
  assert.equal(T.localToUtc('2026-11-04', '22:30', TZ).toISOString(), '2026-11-05T02:30:00.000Z');
  assert.equal(T.localToUtc('2026-12-31', '23:00', TZ).toISOString(), '2027-01-01T03:00:00.000Z');
});

test('UTC o cualquier desfase → fecha y hora de Caracas', () => {
  assert.deepEqual(T.utcToLocal('2026-11-04T12:00:00Z', TZ), { date: '2026-11-04', time: '08:00', weekday: 3 });
  assert.deepEqual(T.utcToLocal('2026-11-05T02:30:00.000Z', TZ), { date: '2026-11-04', time: '22:30', weekday: 3 });
  assert.deepEqual(T.utcToLocal('2026-11-04T10:00:00.000+02:00', TZ), { date: '2026-11-04', time: '04:00', weekday: 3 });
  assert.equal(T.utcToLocal('2026-11-08T14:00:00Z', TZ).weekday, 0); // domingo
});

test('"hoy" depende de Caracas, no de UTC', () => {
  // 2026-11-05 02:00 UTC = 2026-11-04 22:00 en Caracas
  assert.equal(T.todayIn(TZ, Date.parse('2026-11-05T02:00:00Z')), '2026-11-04');
});

test('validadores de formato', () => {
  assert.ok(T.isIsoDate('2026-02-28'));
  assert.ok(!T.isIsoDate('2026-02-30'));
  assert.ok(T.isMonth('2026-11'));
  assert.ok(!T.isMonth('2026-13'));
  assert.ok(T.isTime('08:00'));
  assert.ok(!T.isTime('8:00'));
  assert.equal(T.lastDayOfMonth('2028-02'), '2028-02-29');
  assert.equal(T.addMonths('2026-11', 3), '2027-02');
});
