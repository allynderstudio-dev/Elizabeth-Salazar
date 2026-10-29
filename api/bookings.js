// POST /api/bookings — crea una solicitud PENDIENTE en Cal.com (requiere aprobación manual).
// Body: { referencia, servicio, paquete, precio, abono, fecha, hora, zonaHoraria, nombre, whatsapp, detalles,
//         bebes?, nacio?, nacimiento? (Newborn), sitio (campo trampa: siempre vacío) }
// → 201 { referencia, uid, estado: 'pendiente', ... }   (uid real de Cal.com, verificado)
// → 409 { error: 'slot_taken' | 'price_changed' | 'not_reservable' }
// → 429 { error: 'rate_limited' }  demasiados envíos desde la misma IP (Retry-After)
// → 503 { error: 'uncertain' }   no se sabe si se creó: reintentar con la MISMA referencia
// → 503 { error: 'busy' | 'unavailable' } no se creó nada: se puede reintentar
const { send, readJson, sendError, serviceFromEnv, clientIp } = require('./_lib/http.js');
const { createRateLimiter } = require('./_lib/rate-limit.js');

function createHandler(getService = serviceFromEnv, getLimiter = () => createRateLimiter({ store: getService().store })) {
  let limiter = null;
  return async (req, res) => {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' }, { Allow: 'POST' });
    if (!String(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'content_type' });
    try {
      const body = await readJson(req);
      // Campo trampa invisible para personas: si viene lleno, es un envío automático
      if (body && typeof body === 'object' && body.sitio) return send(res, 400, { error: 'invalid' });
      limiter = limiter || getLimiter();
      await limiter.check(clientIp(req), body && body.referencia);
      const out = await getService().createBooking(body);
      return send(res, out.reutilizada ? 200 : 201, out);
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
