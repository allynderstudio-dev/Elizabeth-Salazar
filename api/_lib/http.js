// Utilidades HTTP comunes a los handlers de Vercel (Node.js runtime).
const crypto = require('node:crypto');
const { CalApiError, createCalClient } = require('./cal-client.js');
const { BookingError, createBookingService } = require('./booking-service.js');

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
      blocked: [409, { error: 'blocked', mensaje: err.message }],
    };
    const [status, body] = map[err.code] || [500, { error: 'server' }];
    if (status >= 500) log.error(`[reservas] ${err.code}: ${err.message}`);
    return send(res, status, body);
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

// Servicio con credenciales del entorno (solo servidor)
let cached = null;
function serviceFromEnv(env = process.env) {
  if (!cached) {
    const cal = createCalClient({ apiKey: env.CAL_API_KEY, baseUrl: env.CAL_API_BASE || undefined });
    cached = createBookingService({ cal });
  }
  return cached;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { send, readJson, queryOf, sendError, serviceFromEnv, safeEqual };
