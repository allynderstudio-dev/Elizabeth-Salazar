// Texto y envío del recordatorio diario para Ely. Solo a Ely, nunca al cliente.
const SERVICE_NAMES = Object.fromEntries(require('../../js/booking-data.js').SERVICES.map((s) => [s.slug, s.name]));

function reminderText(pending) {
  const lines = [
    `Tienes ${pending.length} ${pending.length === 1 ? 'solicitud' : 'solicitudes'} de la página web pendientes desde hace 24 horas o más.`,
    'Revisa el abono y confirma, rechaza o cancela cada una en Cal.com (Bookings → Unconfirmed). Si ya reportaron el pago y aún no lo verificas, puedes dejarla pendiente.',
    'Este recordatorio no cambia ninguna reserva.',
    '',
  ];
  pending.forEach((p) => {
    const [y, m, d] = p.fecha.split('-');
    lines.push(`• ${SERVICE_NAMES[p.servicio] || p.servicio} · ${d}/${m}/${y} ${p.hora} · ${p.nombre} · WhatsApp ${p.whatsapp} · abono US$${p.abonoUSD} · enviada hace ${p.horasDesdeSolicitud} h · ${p.uid}`);
  });
  return lines.join('\n');
}

// → { canal: 'correo' | 'registro' | 'ninguno', ... }
async function sendReminder(pending, env = process.env, fetchImpl = globalThis.fetch) {
  if (!pending.length) return { canal: 'ninguno' };
  const text = reminderText(pending);
  if (!env.RESEND_API_KEY || !env.REMINDER_EMAIL_TO) {
    console.log(`[reservas] Recordatorio (sin correo configurado):\n${text}`);
    return { canal: 'registro' };
  }
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.REMINDER_EMAIL_FROM || 'Reservas web <onboarding@resend.dev>',
      to: env.REMINDER_EMAIL_TO.split(',').map((s) => s.trim()),
      subject: `Solicitudes pendientes de revisar: ${pending.length}`,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
  return { canal: 'correo' };
}

module.exports = { reminderText, sendReminder };
