// Tarea diaria (Vercel Cron, ver vercel.json): recordatorio para Ely de las solicitudes del sitio
// que siguen pendientes 24 horas o más después de enviarse (BR-15).
// SOLO LECTURA: no confirma, rechaza ni cancela nada. Las solicitudes pendientes nunca vencen
// solas; Ely decide en Cal.com (Bookings → Unconfirmed).
// Vercel envía "Authorization: Bearer <CRON_SECRET>". Sin CRON_SECRET, rechaza todo.
// Envío: si están RESEND_API_KEY y REMINDER_EMAIL_TO, manda un correo a Ely con el resumen;
// si no, solo lo deja en el registro de la función.
const { send, sendError, serviceFromEnv, safeEqual } = require('../_lib/http.js');
const { sendReminder } = require('../_lib/reminder.js');

function createHandler(getService = serviceFromEnv, env = process.env, deps = {}) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method' });
    const secret = env.CRON_SECRET;
    if (!secret || !safeEqual(req.headers.authorization || '', `Bearer ${secret}`)) return send(res, 401, { error: 'unauthorized' });
    try {
      const pending = await getService().pendingForReview();
      const delivery = await (deps.sendReminder || sendReminder)(pending, env);
      console.log('[reservas] Recordatorio', JSON.stringify({ pendientes: pending.length, envio: delivery }));
      return send(res, 200, { pendientes: pending.length, envio: delivery });
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
