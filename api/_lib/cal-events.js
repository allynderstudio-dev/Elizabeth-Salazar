// Paquete del sitio → tipo de evento de Cal.com. Mapeo EXPLÍCITO, uno por paquete.
// Clave: '<servicio>/<paquete>' con los slugs de js/booking-data.js.
//   eventTypeId      ID numérico del evento en Cal.com (Event Types → el número de la URL)
//   durationMinutes  duración configurada en ese evento; se verifica contra la respuesta de /v2/slots
//
// Un paquete que no figure aquí NO reserva en línea: el sitio lo atiende en modo WhatsApp.

// Un solo estudio y una sola agenda: todos los paquetes usan el evento "Website"
// (cal.com/ely-salazar-c1mcq0/website), aprobación manual, 2 h.
// Decisión de Ely (27/10/2026): todos bloquean 2 h, incluidos los de "2 a 3 h" y "unas 3 h".
// Si una sesión se alarga, el tiempo extra NO queda bloqueado en el calendario.
const STUDIO = { eventTypeId: 7652774, durationMinutes: 120 };

const CAL_EVENTS = {
  'embarazo/estudio': STUDIO, // Embarazo · Estudio (2 h)
  'embarazo/bathroom': STUDIO, // Embarazo · Bathroom (2 h)
  'embarazo/exteriores': STUDIO, // Embarazo · Exteriores (2 a 3 h)
  'newborn/sesion-newborn': STUDIO, // Newborn · Sesión Newborn (2 h)
  'newborn/sesion-retrato': STUDIO, // Newborn · Sesión + Retrato (2 a 3 h)
  'mes-a-mes/sesion-mes-a-mes': STUDIO, // Mes a Mes · Sesión Mes a Mes (2 h)
  'mes-a-mes/bathroom': STUDIO, // Mes a Mes · Bathroom (2 h)
  'cumpleanos-infantiles/estudio': STUDIO, // Cumpleaños infantiles · Estudio (2 a 3 h)
  'cumpleanos-infantiles/cake-smash': STUDIO, // Cumpleaños infantiles · Cake Smash (2 h)
  'cumpleanos-infantiles/tematica-cake-smash': STUDIO, // Cumpleaños infantiles · Temática + Cake Smash (2 h)
  'cumpleanos-infantiles/exteriores': STUDIO, // Cumpleaños infantiles · Exteriores (2 h)
  'cumpleanos-adultos/estudio': STUDIO, // Cumpleaños adultos · Estudio (2 h)
  'cumpleanos-adultos/exteriores': STUDIO, // Cumpleaños adultos · Exteriores (2 h)
  'quince-anos/estudio': STUDIO, // Quince años · Estudio (2 h)
  'quince-anos/iglesia': STUDIO, // Quince años · Iglesia (2 h)
  'quince-anos/exteriores': STUDIO, // Quince años · Exteriores (2 a 3 h)
  'quince-anos/recepcion': STUDIO, // Quince años · Recepción (unas 3 h)
  'revelacion-de-sexo/estudio': STUDIO, // Revelación de sexo · Estudio (2 h)
  'revelacion-de-sexo/exteriores': STUDIO, // Revelación de sexo · Exteriores (2 h)
  'recepciones/recepcion': STUDIO, // Recepciones · Recepción (unas 3 h)
  'familiar/sesion-familiar': STUDIO, // Familiar · Sesión familiar (2 h)
  'parejas/sesion-de-pareja': STUDIO, // Parejas · Sesión de pareja (2 h)
  'fotografia-profesional-y-comercial/sesion-profesional': STUDIO, // Fotografía profesional y comercial · Sesión profesional (2 h)
};

module.exports = CAL_EVENTS;
