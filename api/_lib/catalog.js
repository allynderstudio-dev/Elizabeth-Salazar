// Catálogo y reglas del servidor. Lee los mismos archivos que el navegador
// (js/booking-data.js y js/booking-config.js) para que precios y horarios no se dupliquen.
const BOOKING_DATA = require('../../js/booking-data.js');
const BOOKING_CONFIG = require('../../js/booking-config.js');
const CAL_EVENTS = require('./cal-events.js');

function findPackage(serviceSlug, packageSlug) {
  const service = BOOKING_DATA.SERVICES.find((s) => s.slug === serviceSlug);
  const pkg = service && service.packages.find((p) => p.slug === packageSlug);
  return service && pkg ? { service, pkg } : null;
}

// Evento de Cal.com del paquete, o null si ese paquete se coordina por WhatsApp.
function eventFor(serviceSlug, packageSlug, events = CAL_EVENTS) {
  const entry = events[`${serviceSlug}/${packageSlug}`];
  if (!entry) return null;
  if (!Number.isInteger(entry.eventTypeId) || !Number.isInteger(entry.durationMinutes)) {
    throw new Error(`Mapeo de Cal.com inválido para ${serviceSlug}/${packageSlug}`);
  }
  return entry;
}

// Abono redondeado a centavos (precios en US$)
const depositFor = (price) => Math.round(price * BOOKING_CONFIG.depositRate * 100) / 100;

module.exports = { BOOKING_DATA, BOOKING_CONFIG, CAL_EVENTS, findPackage, eventFor, depositFor };
