// Configuración del flujo de reserva.
// Fase actual: NO hay backend. Con los endpoints en null, el flujo no muestra
// disponibilidad real ni confirma solicitudes: todo se completa por WhatsApp.
// Fase futura (notas técnicas de Figma): Sitio web → Cal.com → Google Calendar.
window.BOOKING_CONFIG = {
  // TODO(Cal.com): URL del servicio que devuelve la disponibilidad.
  // Contrato esperado (ver adaptadores en js/booking.js):
  //   GET {availabilityEndpoint}?servicio=<slug>&paquete=<slug>&mes=AAAA-MM
  //   → { dias: { 'AAAA-MM-DD': ['08:00', '10:00', ...] } }  (solo horarios libres)
  availabilityEndpoint: null,

  // TODO(Cal.com): URL que registra la solicitud (reserva provisional de 24 h).
  //   POST {bookingEndpoint}  body JSON (ver buildBookingPayload en js/booking.js)
  //   → { id: '...', estado: 'pendiente-de-abono' }
  bookingEndpoint: null,

  whatsappNumber: '584266463929',
  timezone: 'America/Caracas',
  timezoneLabel: 'hora de Venezuela',

  // Lunes a sábado (0 = domingo … 6 = sábado)
  workingDays: [1, 2, 3, 4, 5, 6],

  // Horas de inicio permitidas (24 h) y su etiqueta en español
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
};
