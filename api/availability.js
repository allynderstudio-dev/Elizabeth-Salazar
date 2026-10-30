// GET /api/availability?servicio=<slug>&paquete=<slug>&mes=AAAA-MM
// → 200 { reservable: true, duracionMinutos, dias: { 'AAAA-MM-DD': ['08:00', ...] }, turnstile? }  (hora de Caracas)
//        turnstile: clave de SITIO de Cloudflare Turnstile (pública) si la verificación está activa
// → 200 { reservable: false, motivo }  'sin_evento' (paquete sin Cal.com) o 'reservas_desactivadas'
//                                  (sin escritura o sin almacén): el sitio solo ofrece consultas por
//                                  WhatsApp. En producción es un incidente y se registra como error.
// → 503 { error: 'unavailable' } Cal.com no respondió; el sitio no inventa disponibilidad
const { send, queryOf, sendError, serviceFromEnv, offlineIncident, OFFLINE_INCIDENT } = require('./_lib/http.js');
const { captchaShared } = require('./_lib/captcha.js');

function createHandler(getService = serviceFromEnv, log = console, getCaptcha = captchaShared) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' }, { Allow: 'GET' });
    try {
      const q = queryOf(req);
      const service = getService();
      const out = await service.getAvailability({ servicio: q.servicio, paquete: q.paquete, mes: q.mes });
      if (out.motivo === 'reservas_desactivadas' && offlineIncident(service)) log.error(OFFLINE_INCIDENT);
      const siteKey = out.reservable && getCaptcha().siteKey;
      return send(res, 200, siteKey ? { ...out, turnstile: siteKey } : out);
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
