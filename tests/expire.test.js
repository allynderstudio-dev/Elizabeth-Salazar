const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, request } = require('./helpers/setup.js');
const { createHandler } = require('../api/cron/expire-requests.js');

const H = 36e5;

async function seed() {
  const ctx = setup();
  const a = await ctx.service.createBooking(request({ referencia: 'ref-vence-0000000a', hora: '08:00' }));
  const b = await ctx.service.createBooking(request({ referencia: 'ref-vence-0000000b', hora: '10:00' }));
  return { ...ctx, a, b };
}

test('off (por defecto): no consulta ni rechaza nada', async () => {
  const { service, fake } = await seed();
  const before = fake.calls.length;
  const r = await service.expirePending({ mode: 'off' });
  assert.equal(r.vencidas.length, 0);
  assert.equal(fake.calls.length, before);
});

test('dentro de las 24 h no vence', async () => {
  const { service, fake, advance } = await seed();
  advance(23 * H);
  const r = await service.expirePending({ mode: 'on' });
  assert.equal(r.vencidas.length, 0);
  assert.ok(fake.bookings.every((x) => x.status === 'pending'));
});

test('dry-run informa sin tocar Cal.com', async () => {
  const { service, fake, advance } = await seed();
  advance(24 * H + 1);
  const r = await service.expirePending({ mode: 'dry-run' });
  assert.equal(r.vencidas.length, 2);
  assert.ok(r.vencidas.every((v) => v.simulada));
  assert.ok(fake.bookings.every((x) => x.status === 'pending'));
  assert.equal(fake.calls.filter((c) => c.path.endsWith('/decline')).length, 0);
});

test('on: rechaza vencidas y respeta las ya confirmadas (estado vigente)', async () => {
  const { service, fake, advance, a, b } = await seed();
  advance(25 * H);
  // Ely confirmó "a" (abono recibido); la lista aún podría traerla como pendiente
  fake.inject({ method: 'GET', path: new RegExp(`/v2/bookings/${a.uid}$`), kind: 'override', override: { status: 'accepted' }, once: false });
  const r = await service.expirePending({ mode: 'on' });
  assert.deepEqual(r.vencidas.map((v) => v.uid), [b.uid]);
  assert.ok(r.omitidas.some((o) => o.uid === a.uid && /accepted/.test(o.motivo)));
  assert.equal(fake.bookings.find((x) => x.uid === a.uid).status, 'pending');
  assert.equal(fake.bookings.find((x) => x.uid === b.uid).status, 'rejected');
  // Repetir la tarea es seguro: ya no hay nada que vencer
  const again = await service.expirePending({ mode: 'on' });
  assert.equal(again.vencidas.length, 0);
});

test('no toca reservas que no creó el sitio', async () => {
  const { service, fake, advance } = await seed();
  fake.bookings.forEach((x) => { x.metadata = {}; });
  advance(25 * H);
  const r = await service.expirePending({ mode: 'on' });
  assert.equal(r.vencidas.length, 0);
  assert.equal(r.revisadas, 0);
});

test('un error en una reserva no detiene las demás', async () => {
  const { service, fake, advance, a, b } = await seed();
  advance(25 * H);
  fake.inject({ method: 'POST', path: new RegExp(`/v2/bookings/${a.uid}/decline$`), kind: 500 });
  const r = await service.expirePending({ mode: 'on' });
  assert.deepEqual(r.vencidas.map((v) => v.uid), [b.uid]);
  assert.equal(r.errores[0].uid, a.uid);
});

test('en producción, "on" queda bloqueado sin regla para abonos en revisión', async () => {
  const { service } = await seed();
  await assert.rejects(service.expirePending({ mode: 'on', production: true }), (err) => err.code === 'blocked');
  const r = await service.expirePending({ mode: 'dry-run', production: true });
  assert.equal(r.mode, 'dry-run');
});

test('endpoint del cron: exige CRON_SECRET', async () => {
  const { service } = await seed();
  const call = async (env, auth) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = JSON.parse(body); } };
    await createHandler(() => service, env)({ method: 'GET', headers: auth ? { authorization: auth } : {} }, res);
    return res;
  };
  assert.equal((await call({}, 'Bearer x')).statusCode, 401); // sin secreto configurado: cerrado
  assert.equal((await call({ CRON_SECRET: 's3creto' }, 'Bearer otro')).statusCode, 401);
  assert.equal((await call({ CRON_SECRET: 's3creto' })).statusCode, 401);
  const ok = await call({ CRON_SECRET: 's3creto' }, 'Bearer s3creto');
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.mode, 'off');
  const prod = await call({ CRON_SECRET: 's3creto', EXPIRATION_MODE: 'on', VERCEL_ENV: 'production' }, 'Bearer s3creto');
  assert.equal(prod.statusCode, 409);
  assert.equal(prod.body.error, 'blocked');
});
