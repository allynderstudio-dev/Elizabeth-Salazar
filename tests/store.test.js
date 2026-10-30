// Cliente REST de Redis (Upstash) contra un Upstash simulado: forma de los comandos, TTL y
// fallos (T-RD-01 a T-RD-03 simulados; la prueba real necesita una base de datos de Preview).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRedisStore, probeStore } = require('../api/_lib/store.js');
const { setup, request } = require('./helpers/setup.js');

// Upstash REST simulado: POST / con ["CMD", ...] y POST /pipeline con [[...], ...]
function fakeUpstash({ token = 't', failWith = null, now = () => Date.now() } = {}) {
  const data = new Map();
  const commands = [];
  const live = (k) => { const e = data.get(k); if (e && e.exp && e.exp <= now()) { data.delete(k); return null; } return e || null; };
  function run(cmd) {
    commands.push(cmd);
    const [name, key, ...args] = cmd;
    if (name === 'SET') {
      const nx = args.includes('NX');
      const px = args.includes('PX') ? Number(args[args.indexOf('PX') + 1]) : 0;
      if (nx && live(key)) return { result: null };
      data.set(key, { value: args[0], exp: px ? now() + px : 0 });
      return { result: 'OK' };
    }
    if (name === 'INCR') { const e = live(key) || { value: '0', exp: 0 }; e.value = String(Number(e.value) + 1); data.set(key, e); return { result: Number(e.value) }; }
    if (name === 'EVAL') {
      const [, k, value, ms] = cmd.slice(2);
      const e = live(k);
      if (!e || e.value !== value) return { result: 0 };
      if (/del/.test(key)) data.delete(k); else e.exp = now() + Number(ms);
      return { result: 1 };
    }
    return { error: `ERR unknown command ${name}` };
  }
  const fetchImpl = async (url, init) => {
    if (failWith === 'network') throw new TypeError('fetch failed');
    if (failWith) return new Response('{}', { status: failWith });
    if (init.headers.Authorization !== `Bearer ${token}`) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const body = JSON.parse(init.body);
    const out = new URL(url).pathname === '/pipeline' ? body.map(run) : run(body);
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { fetchImpl, data, commands };
}

test('T-RD-01 (simulado): SET NX PX, liberar y extender solo con el token propio, INCR con TTL', async () => {
  const up = fakeUpstash();
  const store = createRedisStore({ url: 'https://redis.test', token: 't', fetchImpl: up.fetchImpl });
  assert.equal(await store.setNx('k', 'a', 45000), true);
  assert.deepEqual(up.commands[0], ['SET', 'k', 'a', 'NX', 'PX', '45000']);
  assert.equal(await store.setNx('k', 'b', 45000), false);
  assert.equal(await store.delIfEquals('k', 'b'), false, 'no libera un bloqueo ajeno');
  assert.equal(await store.expireIfEquals('k', 'a', 5000), true);
  assert.equal(await store.delIfEquals('k', 'a'), true);
  assert.equal(up.data.has('k'), false);
  assert.equal(await store.incr('c', 600000), 1);
  assert.equal(await store.incr('c', 600000), 2);
  assert.ok(up.data.get('c').exp > 0, 'el contador caduca solo');
});

test('T-RD-02 (simulado): dos instancias con el mismo Redis → una sola reserva', async () => {
  const up = fakeUpstash();
  const redis = () => createRedisStore({ url: 'https://redis.test', token: 't', fetchImpl: up.fetchImpl });
  const { instance, fake } = setup({ store: redis(), enforce: false, latencyMs: 5 });
  const a = instance();
  const b = instance();
  const results = await Promise.allSettled([
    a.createBooking(request({ referencia: 'ref-redis-a-000001' })),
    b.createBooking(request({ referencia: 'ref-redis-b-000001' })),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(fake.bookings.length, 1);
  assert.equal([...up.data.keys()].filter((k) => k.includes(':lock:')).length, 0, 'el bloqueo se libera');
});

for (const failWith of [500, 'network']) {
  test(`T-RD-03: Redis ${failWith} al crear → "busy", ninguna reserva`, async () => {
    const store = createRedisStore({ url: 'https://redis.test', token: 't', fetchImpl: fakeUpstash({ failWith }).fetchImpl });
    const { service, fake } = setup({ store });
    await assert.rejects(service.createBooking(request()), (err) => err.code === 'busy');
    assert.equal(fake.calls.filter((c) => c.method === 'POST').length, 0);
    assert.equal(fake.bookings.length, 0);
  });
}

test('probeStore usa una clave de salud propia que no queda guardada', async () => {
  const up = fakeUpstash();
  const store = createRedisStore({ url: 'https://redis.test', token: 't', fetchImpl: up.fetchImpl });
  assert.equal(await probeStore(store, 'ely-reservas:production'), 'ok');
  assert.equal(up.commands[0][1], 'ely-reservas:production:health');
  assert.equal(up.data.size, 0);
  assert.match(await probeStore(createRedisStore({ url: 'https://redis.test', token: 'mal', fetchImpl: up.fetchImpl }), 'p'), /^error/);
  assert.equal(await probeStore(null, 'p'), 'ninguno');
});
