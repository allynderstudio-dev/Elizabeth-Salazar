// Tarea programada (Vercel Cron, ver vercel.json): vence solicitudes pendientes con más de 24 h.
// Vercel envía "Authorization: Bearer <CRON_SECRET>". Sin CRON_SECRET, rechaza todo.
// EXPIRATION_MODE: off (por defecto) | dry-run (solo informa) | on (rechaza en Cal.com).
// En producción, 'on' queda bloqueado hasta definir la regla para abonos pendientes de revisión.
const { send, sendError, serviceFromEnv, safeEqual } = require('../_lib/http.js');

// TODO(regla de negocio): qué hacer si el cliente pagó pero Ely aún no revisó el abono.
// Mientras sea null, la caducidad no puede activarse en producción.
const PAYMENT_REVIEW_RULE = null;

function createHandler(getService = serviceFromEnv, env = process.env) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method' });
    const secret = env.CRON_SECRET;
    if (!secret || !safeEqual(req.headers.authorization || '', `Bearer ${secret}`)) return send(res, 401, { error: 'unauthorized' });
    try {
      const report = await getService().expirePending({
        mode: env.EXPIRATION_MODE || 'off',
        production: env.VERCEL_ENV === 'production',
        paymentReviewRule: PAYMENT_REVIEW_RULE,
      });
      console.log('[reservas] Vencimiento', JSON.stringify(report));
      return send(res, 200, report);
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
