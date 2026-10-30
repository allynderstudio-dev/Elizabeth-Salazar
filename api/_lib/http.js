// Utilidades HTTP comunes a los handlers de Vercel (Node.js runtime).
const crypto = require('node:crypto');
const { CalApiError, createCalClient } = require('./cal-client.js');
const { BookingError, createBookingService } = require('./booking-service.js');
const { resolveEnvironment } = require('./environment.js');
const { storeFromEnv } = require('./store.js');

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || 'null') : req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 32 * 1024) throw new BookingError('invalid', 'Cuerpo demasiado grande');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

const queryOf = (req) => req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);

// Traduce errores a respuestas sin filtrar detalles internos ni credenciales
function sendError(res, err, log = console) {
  if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid', mensaje: 'JSON inválido' });
  if (err instanceof BookingError) {
    const map = {
      invalid: [400, { error: 'invalid', campo: err.field }],
      not_reservable: [409, { error: 'not_reservable' }],
      price_changed: [409, { error: 'price_changed', precio: err.precio, abono: err.abono }],
      slot_taken: [409, { error: 'slot_taken' }],
      uncertain: [503, { error: 'uncertain' }],
      verification_failed: [502, { error: 'verification_failed' }],
      busy: [503, { error: 'busy' }],
      rate_limited: [429, { error: 'rate_limited' }],
      captcha_failed: [403, { error: 'captcha_failed' }],
      captcha_expired: [403, { error: 'captcha_expired' }],
      captcha_unavailable: [503, { error: 'captcha_unavailable' }],
    };
    const [status, body] = map[err.code] || [500, { error: 'server' }];
    if (status >= 500) log.error(`[reservas] ${err.code}: ${err.message}`);
    const retry = { busy: '5', captcha_unavailable: '5', rate_limited: String(err.retryAfter || 600) }[err.code];
    return send(res, status, body, retry ? { 'Retry-After': retry } : {});
  }
  if (err instanceof CalApiError) {
    log.error(`[reservas] Cal.com ${err.kind} ${err.status || ''}: ${err.message}`);
    // Lectura fallida: no se creó nada y se puede reintentar
    if (['network', 'server', 'rate'].includes(err.kind)) return send(res, 503, { error: 'unavailable' }, { 'Retry-After': '10' });
    return send(res, 502, { error: 'upstream' });
  }
  log.error('[reservas] Error inesperado', err);
  return send(res, 500, { error: 'server' });
}

// Servicio con credenciales del entorno (solo servidor). Ver api/_lib/environment.js y store.js.
let cached = null;
function serviceFromEnv(env = process.env, log = console) {
  if (!cached) {
    const envInfo = resolveEnvironment(env);
    const store = storeFromEnv(env);
    const cal = createCalClient({ apiKey: envInfo.apiKey, baseUrl: env.CAL_API_BASE || undefined, allowWrites: envInfo.canWrite });
    cached = createBookingService({ cal, events: envInfo.events, canWrite: envInfo.canWrite, store, lockPrefix: `ely-reservas:${envInfo.mode}` });
    cached.store = store;
    cached.environment = envInfo.mode;
    cached.lockPrefix = `ely-reservas:${envInfo.mode}`;
    // Sin secretos: solo el modo, el evento y el tipo de almacén
    const ids = [...new Set(Object.values(envInfo.events).map((e) => e.eventTypeId))].join(',');
    log.log(`[reservas] modo=${envInfo.mode} eventos=${ids} escritura=${envInfo.canWrite ? 'sí' : 'no'} almacén=${store ? store.kind : 'ninguno'} reservas=${cached.mode}`);
    if (envInfo.mode === 'production' && !store) log.error(OFFLINE_INCIDENT);
    if (envInfo.mode === 'production' && !(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY)) log.error('[reservas] INCIDENTE: faltan TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY: los envíos no pasan por la verificación de Cloudflare Turnstile');
  }
  return cached;
}

// Producción sin reservas en línea es un incidente, no un estado normal (BR-18)
const OFFLINE_INCIDENT = '[reservas] INCIDENTE: producción sin almacén compartido (KV_REST_API_URL/TOKEN): las reservas en línea están desactivadas y el sitio solo ofrece consultas por WhatsApp';
const offlineIncident = (service) => service.environment === 'production' && service.mode !== 'online';

// IP del cliente detrás del proxy de Vercel
const clientIp = (req) =>
  String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'desconocida')
    .split(',')[0]
    .trim();

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { send, readJson, queryOf, sendError, serviceFromEnv, safeEqual, clientIp, offlineIncident, OFFLINE_INCIDENT };
