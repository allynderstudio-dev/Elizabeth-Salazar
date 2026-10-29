// Newborn solo después del nacimiento (BR-08, DEV-P0-03), validado en el servidor.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, newbornRequest, ALL_120 } = require('./helpers/setup.js');
const { addCalendarMonths, newbornEligibility } = require('../js/booking-data.js');

const code = (service, over) => service.createBooking(newbornRequest(over)).then(() => 'ok', (err) => `${err.code}:${err.field || ''}`);

test('meses de calendario con ajuste a fin de mes', () => {
  assert.equal(addCalendarMonths('2026-10-31', 4), '2027-02-28');
  assert.equal(addCalendarMonths('2026-07-31', 4), '2026-11-30');
  assert.equal(addCalendarMonths('2026-07-20', 4), '2026-11-20');
  const e = (birth, session, born = 'Sí') => newbornEligibility({ born, birth, session, today: '2026-10-28' });
  assert.equal(e('2026-07-20', '2026-11-20'), 'too_old');
  assert.equal(e('2026-07-21', '2026-11-20'), 'ok');
  assert.equal(e('2026-07-31', '2026-11-30'), 'too_old');
  assert.equal(e('2026-10-28', '2026-11-20'), 'ok'); // nacido hoy
  assert.equal(e('2026-11-01', '2026-11-20'), 'invalid'); // futuro
  assert.equal(e(undefined, '2026-11-20', 'No'), 'unborn');
});

test('T-NB-06/07/08/09/11/13: el servidor rechaza antes de llamar a Cal.com', async () => {
  const { service, fake } = setup({ events: ALL_120 });
  assert.equal(await code(service, { nacio: 'No', nacimiento: undefined, fecha: '2026-11-20' }), 'invalid:nacio');
  assert.equal(await code(service, { nacio: undefined, fecha: '2026-11-20' }), 'invalid:nacio');
  assert.equal(await code(service, { nacimiento: '2026-07-20', fecha: '2026-11-20' }), 'invalid:nacimiento'); // 4 meses exactos
  assert.equal(await code(service, { nacimiento: '2026-07-31', fecha: '2026-11-30' }), 'invalid:nacimiento'); // límite ajustado
  assert.equal(await code(service, { nacimiento: '2026-11-05', fecha: '2026-11-20' }), 'invalid:nacimiento'); // posterior a hoy (02/11)
  assert.equal(await code(service, { nacimiento: 'ayer', fecha: '2026-11-20' }), 'invalid:nacimiento');
  assert.equal(fake.calls.length, 0, 'ninguna llamada a Cal.com: no se crea ninguna solicitud');
  assert.equal(await code(service, { nacimiento: '2026-07-21', fecha: '2026-11-20' }), 'ok'); // 3 meses y 30 días
  assert.equal(fake.bookings[0].metadata.nacimiento, '2026-07-21');
});
