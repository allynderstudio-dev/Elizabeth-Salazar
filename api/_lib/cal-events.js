// Paquete del sitio → tipo de evento de Cal.com. Mapeo EXPLÍCITO, uno por paquete.
// Clave: '<servicio>/<paquete>' con los slugs de js/booking-data.js.
//   eventTypeId      ID numérico del evento en Cal.com (Event Types → el número de la URL)
//   durationMinutes  duración configurada en ese evento; se verifica contra la respuesta de /v2/slots
//
// Un paquete que no figure aquí NO reserva en línea: el sitio lo atiende en modo WhatsApp.
// No conectes paquetes con duraciones u horarios distintos a un mismo evento, ni todos al de prueba.
// Ejemplo (no activo):
//   'embarazo/estudio': { eventTypeId: 1234567, durationMinutes: 120 },
const CAL_EVENTS = {
};

module.exports = CAL_EVENTS;
