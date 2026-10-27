// Paquete del sitio → tipo de evento de Cal.com. Mapeo EXPLÍCITO, uno por paquete.
// Clave: '<servicio>/<paquete>' con los slugs de js/booking-data.js.
//   eventTypeId      ID numérico del evento en Cal.com (Event Types → el número de la URL)
//   durationMinutes  duración configurada en ese evento; se verifica contra la respuesta de /v2/slots
//
// Un paquete que no figure aquí NO reserva en línea: el sitio lo atiende en modo WhatsApp.
// No conectes paquetes con duraciones u horarios distintos a un mismo evento, ni todos al de prueba.

// Producción: vacío hasta vincular la cuenta definitiva de Cal.com (todo sigue por WhatsApp).
// Ejemplo: 'embarazo/estudio': { eventTypeId: 1234567, durationMinutes: 120 },
const PRODUCTION_EVENTS = {
};

// Vista previa de Vercel y desarrollo local: evento de PRUEBA "Ely — Sesión de prueba."
// (cal.com/dylan-nieto-y0krpq/ely-sesion-de-prueba). Nunca se usa en producción.
const TEST_EVENTS = {
  'embarazo/estudio': { eventTypeId: 7600420, durationMinutes: 120 },
};

module.exports = process.env.VERCEL_ENV === 'production' ? PRODUCTION_EVENTS : TEST_EVENTS;
