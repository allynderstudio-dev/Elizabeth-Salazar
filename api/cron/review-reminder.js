// Tarea diaria (Vercel Cron, ver vercel.json): recordatorio para Ely de las solicitudes del sitio
// que siguen pendientes 24 horas o más después de enviarse (BR-15).
// SOLO LECTURA: no confirma, rechaza ni cancela nada. Las solicitudes pendientes nunca vencen
// solas; Ely decide en Cal.com (Bookings → Unconfirmed).
// Vercel envía "Authorization: Bearer <CRON_SECRET>". Sin CRON_SECRET, rechaza todo.
// Envío: si están RESEND_API_KEY y REMINDER_EMAIL_TO, manda un correo a Ely con el resumen;
// si no, solo lo deja en el registro de la función.
// También avisa de incidentes de configuración (BR-18): producción sin reservas en línea o con
// el almacén compartido sin responder. Se envían aunque no haya solicitudes pendientes.
const { send, sendError, serviceFromEnv, safeEqual, offlineIncident } = require('../_lib/http.js');
const { sendReminder } = require('../_lib/reminder.js');
const { probeStore } = require('../_lib/store.js');

async function incidents(service, env) {
  const out = [];
  if (offlineIncident(service)) out.push('Las reservas en línea están DESACTIVADAS en producción: falta el almacén compartido (Upstash Redis). El sitio no registra ni aparta horarios; solo ofrece consultas por WhatsApp.');
  if (service.environment === 'production' && !(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY)) out.push('Faltan TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY: los envíos no pasan por la verificación de Cloudflare Turnstile.');
  if (service.environment === 'production' && service.store) {
    const probe = await probeStore(service.store, service.lockPrefix);
    if (probe !== 'ok') out.push(`El almacén compartido (Upstash Redis) no responde (${probe}): las solicitudes en línea fallan hasta que vuelva.`);
  }
  return out;
}

function createHandler(getService = serviceFromEnv, env = process.env, deps = {}) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method' });
    const secret = env.CRON_SECRET;
    if (!secret || !safeEqual(req.headers.authorization || '', `Bearer ${secret}`)) return send(res, 401, { error: 'unauthorized' });
    try {
      const service = getService();
      const problems = await incidents(service, env);
      problems.forEach((p) => console.error(`[reservas] INCIDENTE: ${p}`));
      const pending = await service.pendingForReview();
      const delivery = await (deps.sendReminder || sendReminder)(pending, env, undefined, { incidents: problems });
      console.log('[reservas] Recordatorio', JSON.stringify({ pendientes: pending.length, incidentes: problems.length, envio: delivery }));
      return send(res, 200, { pendientes: pending.length, incidentes: problems.length, envio: delivery });
    } catch (err) {
      return sendError(res, err);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
