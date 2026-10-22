// GET /api/availability?servicio=<slug>&paquete=<slug>&mes=AAAA-MM
// → 200 { reservable: true, duracionMinutos, dias: { 'AAAA-MM-DD': ['08:00', ...] } }  (hora de Caracas)
// → 200 { reservable: false }   el paquete no tiene evento de Cal.com: se coordina por WhatsApp
// → 503 { error: 'unavailable' } Cal.com no respondió; el sitio no inventa disponibilidad
const { send, queryOf, sendError, serviceFromEnv } = require('./_lib/http.js');

function createHandler(getService = serviceFromEnv) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' }, { Allow: 'GET' });
    try {
      const q = queryOf(req);
      return send(res, 200, await getService().getAvailability({ servicio: q.servicio, paquete: q.paquete, mes: q.mes }));
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
