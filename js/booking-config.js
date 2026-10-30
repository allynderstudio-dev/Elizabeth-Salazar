// Configuración del flujo de reserva (la comparten el navegador y el backend en api/_lib).
// Flujo: Sitio web → backend propio (/api, Vercel Functions) → Cal.com → Google Calendar.
// Solo los paquetes con un evento de Cal.com asignado en api/_lib/cal-events.js reservan
// en línea; el resto sigue en modo WhatsApp (horario preferido, sin disponibilidad real).
(() => {
  const BOOKING_CONFIG = {
    // Backend propio. Contratos en api/availability.js y api/bookings.js.
    //   GET  {availabilityEndpoint}?servicio=<slug>&paquete=<slug>&mes=AAAA-MM
    //   → { reservable: true, dias: { 'AAAA-MM-DD': ['08:00', ...] } }  (solo horarios libres)
    //   → { reservable: false }  (paquete sin evento de Cal.com: se coordina por WhatsApp)
    //   POST {bookingEndpoint}  body JSON (ver buildBookingPayload en js/booking.js)
    //   → 201 { referencia, uid, estado: 'pendiente' }
    // En null, todo el flujo vuelve al modo WhatsApp.
    availabilityEndpoint: '/api/availability',
    bookingEndpoint: '/api/bookings',

    whatsappNumber: '584126463929',
    timezone: 'America/Caracas',
    timezoneLabel: 'hora de Venezuela',

    // Lunes a sábado (0 = domingo … 6 = sábado)
    workingDays: [1, 2, 3, 4, 5, 6],

    // Horas de inicio habituales (24 h) y su etiqueta en español
    startTimes: [
      { value: '08:00', label: '8:00 a. m.' },
      { value: '10:00', label: '10:00 a. m.' },
      { value: '14:00', label: '2:00 p. m.' },
      { value: '16:00', label: '4:00 p. m.' },
    ],

    // Días mínimos de anticipación (1 = desde mañana) y meses navegables
    minDaysAhead: 1,
    maxMonthsAhead: 6,

    depositRate: 0.5,
    defaultCountryCode: '+58',
    countryCodes: ['+58', '+57'],

    storageKey: 'ely-reserva-borrador',

    // Cloudflare Turnstile: la clave de SITIO llega del servidor con la disponibilidad
    // (TURNSTILE_SITE_KEY en Vercel, junto a TURNSTILE_SECRET_KEY). Esta solo la sustituye en
    // pruebas locales: '1x00000000000000000000AA' (siempre pasa) o '3x00000000000000000000FF'
    // (pide interacción), con la secreta de prueba correspondiente en el servidor.
    turnstileSiteKey: '',
  };

  if (typeof window !== 'undefined') window.BOOKING_CONFIG = BOOKING_CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = BOOKING_CONFIG;
})();
