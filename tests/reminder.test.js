// Recordatorio para Ely (BR-15) y ausencia de vencimiento automático (BR-03).
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, request } = require('./helpers/setup.js');
const { createHandler } = require('../api/cron/review-reminder.js');
const { reminderText, sendReminder } = require('../api/_lib/reminder.js');
const { createCalClient } = require('../api/_lib/cal-client.js');

const H = 36e5;
const writes = (fake) => fake.calls.filter((c) => c.method !== 'GET');

async function seeded() {
  const ctx = setup();
  const mk = (ref, hora, fecha = '2026-11-20') => ctx.service.createBooking(request({ referencia: ref, hora, fecha }));
  const old72 = await mk('ref-hace-72h-000001', '08:00');
  ctx.advance(47 * H);
  const old25 = await mk('ref-hace-25h-000001', '10:00');
  const accepted = await mk('ref-aceptada-000001', '14:00');
  const rejected = await mk('ref-rechazada-00001', '16:00');
  ctx.advance(2 * H);
  const new23 = await mk('ref-hace-23h-000001', '08:00', '2026-11-21');
  ctx.advance(23 * H);
  ctx.fake.setStatus(accepted.uid, 'accepted');
  ctx.fake.setStatus(rejected.uid, 'rejected');
  return { ...ctx, old72, old25, new23 };
}

test('T-RM-07: solo las pendientes con 24 h o más, sin ninguna escritura en Cal.com', async () => {
  const { service, fake, old72, old25 } = await seeded();
  const before = writes(fake).length;
  const list = await service.pendingForReview();
  assert.deepEqual(list.map((x) => x.uid), [old72.uid, old25.uid]);
  assert.deepEqual(list.map((x) => x.horasDesdeSolicitud), [72, 25]);
  assert.equal(writes(fake).length, before);
});

test('T-LC-03 / T-RM-04: con el reloj 25 h y 72 h después, nada vence ni se cancela', async () => {
  const { service, fake, advance } = await seeded();
  const before = writes(fake).length;
  let sent = 0;
  const handler = createHandler(() => service, { CRON_SECRET: 's' }, { sendReminder: async (p) => { sent += p.length; return { canal: 'registro' }; } });
  const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
  for (const h of [0, 25, 72]) {
    advance(h * H);
    await handler({ method: 'GET', headers: { authorization: 'Bearer s' } }, res);
    assert.equal(res.statusCode, 200);
  }
  assert.ok(sent > 0);
  assert.equal(writes(fake).length, before, 'el recordatorio no escribe en Cal.com');
  assert.deepEqual(fake.bookings.map((b) => b.status).sort(), ['accepted', 'pending', 'pending', 'pending', 'rejected']);
  assert.equal(typeof createCalClient({ apiKey: 'k' }).declineBooking, 'undefined', 'no existe ninguna llamada para rechazar');
});

test('el endpoint exige CRON_SECRET', async () => {
  const { service } = setup();
  const res = { setHeader() {}, end() {} };
  await createHandler(() => service, {})({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
  await createHandler(() => service, { CRON_SECRET: 's' })({ method: 'GET', headers: { authorization: 'Bearer x' } }, res);
  assert.equal(res.statusCode, 401);
});

test('T-RM-03: el correo va solo a Ely; sin configuración, solo al registro', async () => {
  const { service } = await seeded();
  const pending = await service.pendingForReview();
  const text = reminderText(pending);
  assert.match(text, /^Tienes 2 solicitudes de la página web pendientes/);
  assert.match(text, /Este recordatorio no cambia ninguna reserva\./);
  assert.match(text, /Embarazo · 20\/11\/2026 08:00 · María Pérez · WhatsApp \+584121234567 · abono US\$40 · enviada hace 72 h/);

  const orig = console.log;
  console.log = () => {};
  try {
    assert.deepEqual(await sendReminder(pending, {}), { canal: 'registro' });
  } finally { console.log = orig; }
  assert.deepEqual(await sendReminder([], { RESEND_API_KEY: 'r', REMINDER_EMAIL_TO: 'ely@example.com' }), { canal: 'ninguno' });

  const mails = [];
  const out = await sendReminder(pending, { RESEND_API_KEY: 'r', REMINDER_EMAIL_TO: 'ely@example.com' }, async (url, init) => { mails.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); });
  assert.deepEqual(out, { canal: 'correo' });
  assert.equal(mails.length, 1);
  assert.deepEqual(mails[0].body.to, ['ely@example.com']);
  assert.ok(!JSON.stringify(mails[0].body.to).includes('+58'), 'nunca al cliente');
});
