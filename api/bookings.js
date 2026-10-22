// POST /api/bookings — crea una solicitud PENDIENTE en Cal.com (requiere aprobación manual).
// Body: { referencia, servicio, paquete, precio, abono, fecha, hora, zonaHoraria, nombre, whatsapp, detalles }
// → 201 { referencia, uid, estado: 'pendiente', ... }   (uid real de Cal.com, verificado)
// → 409 { error: 'slot_taken' | 'price_changed' | 'not_reservable' }
// → 503 { error: 'uncertain' }   no se sabe si se creó: reintentar con la MISMA referencia
// → 503 { error: 'unavailable' } no se creó nada: se puede reintentar
const { send, readJson, sendError, serviceFromEnv } = require('./_lib/http.js');

function createHandler(getService = serviceFromEnv) {
  return async (req, res) => {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' }, { Allow: 'POST' });
    if (!String(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'content_type' });
    try {
      const body = await readJson(req);
      const out = await getService().createBooking(body);
      return send(res, out.reutilizada ? 200 : 201, out);
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
