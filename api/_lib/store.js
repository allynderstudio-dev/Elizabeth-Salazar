// Almacén compartido con operaciones atómicas, para el bloqueo de reservas y el límite de envíos.
// Las funciones de Vercel no comparten memoria entre instancias: en producción hace falta Redis.
//   createRedisStore  Redis por REST (Upstash; la integración de Vercel define KV_REST_API_URL y
//                     KV_REST_API_TOKEN, o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN).
//   createMemoryStore misma interfaz en memoria: pruebas y servidor local (una sola instancia).
// Interfaz:
//   setNx(key, value, ttlMs)      → true si la clave no existía y quedó creada
//   delIfEquals(key, value)       → borra solo si sigue teniendo ese valor (liberar un bloqueo propio)
//   expireIfEquals(key, value, ttlMs) → nuevo vencimiento solo si sigue teniendo ese valor
//   incr(key, ttlMs)              → nuevo valor; la clave caduca ttlMs después de crearse
class StoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoreError';
  }
}

const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const EXPIRE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";

function createRedisStore({ url, token, fetchImpl = globalThis.fetch, timeoutMs = 3000 }) {
  async function call(path, body) {
    let res;
    try {
      res = await fetchImpl(`${url.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new StoreError(`Sin respuesta del almacén: ${err.message}`);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new StoreError(`El almacén respondió ${res.status}`);
    return json;
  }
  const one = async (cmd) => {
    const json = await call('', cmd);
    if (json.error) throw new StoreError(`Almacén: ${json.error}`);
    return json.result;
  };
  return {
    kind: 'redis',
    async setNx(key, value, ttlMs) { return (await one(['SET', key, value, 'NX', 'PX', String(ttlMs)])) === 'OK'; },
    async delIfEquals(key, value) { return Number(await one(['EVAL', RELEASE_SCRIPT, '1', key, value])) === 1; },
    async expireIfEquals(key, value, ttlMs) { return Number(await one(['EVAL', EXPIRE_SCRIPT, '1', key, value, String(ttlMs)])) === 1; },
    async incr(key, ttlMs) {
      const out = await call('/pipeline', [['SET', key, '0', 'NX', 'PX', String(ttlMs)], ['INCR', key]]);
      if (!Array.isArray(out) || out.some((r) => r.error)) throw new StoreError('Almacén: error en pipeline');
      return Number(out[1].result);
    },
  };
}

function createMemoryStore({ now = () => Date.now() } = {}) {
  const data = new Map(); // key → { value, expires }
  const live = (key) => {
    const e = data.get(key);
    if (e && e.expires <= now()) { data.delete(key); return null; }
    return e || null;
  };
  return {
    kind: 'memory',
    data,
    async setNx(key, value, ttlMs) {
      if (live(key)) return false;
      data.set(key, { value, expires: now() + ttlMs });
      return true;
    },
    async delIfEquals(key, value) {
      const e = live(key);
      if (!e || e.value !== value) return false;
      data.delete(key);
      return true;
    },
    async expireIfEquals(key, value, ttlMs) {
      const e = live(key);
      if (!e || e.value !== value) return false;
      e.expires = now() + ttlMs;
      return true;
    },
    async incr(key, ttlMs) {
      const e = live(key) || { value: 0, expires: now() + ttlMs };
      e.value = Number(e.value) + 1;
      data.set(key, e);
      return e.value;
    },
  };
}

// Producción sin Redis → null: el servicio no reserva en línea (no puede garantizar que no
// haya duplicados entre instancias). Fuera de producción, memoria.
function storeFromEnv(env = process.env, { production = env.VERCEL_ENV === 'production' } = {}) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createRedisStore({ url, token });
  return production ? null : createMemoryStore();
}

// Comprueba que el almacén responde con una clave propia de salud (nunca las de reservas),
// que caduca sola en 10 s. → 'ok' | 'ninguno' | 'error: …'
async function probeStore(store, prefix) {
  if (!store) return 'ninguno';
  const key = `${prefix}:health`;
  const token = `probe-${Date.now()}`;
  try {
    await store.setNx(key, token, 10000);
    await store.delIfEquals(key, token);
    return 'ok';
  } catch (err) {
    return `error: ${err.message}`;
  }
}

module.exports = { createRedisStore, createMemoryStore, storeFromEnv, probeStore, StoreError };
