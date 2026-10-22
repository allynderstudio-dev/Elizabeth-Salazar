// Lógica de reservas, sin dependencias de HTTP (los handlers de api/ la envuelven).
// Cal.com es la única fuente de verdad: no hay base de datos. Los datos propios de cada
// solicitud (referencia, precio, abono, vencimiento) viajan en el metadata de la reserva.
const { CalApiError } = require('./cal-client.js');
const { BOOKING_CONFIG, CAL_EVENTS, findPackage, eventFor, depositFor } = require('./catalog.js');
const T = require('./time.js');

const HOUR = 36e5;
const EXPIRY_HOURS = 24;
const SOURCE = 'web-ely';

// Errores que el handler traduce a respuestas HTTP
class BookingError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    Object.assign(this, extra);
  }
}

function createBookingService({ cal, events = CAL_EVENTS, config = BOOKING_CONFIG, now = () => Date.now(), log = console } = {}) {
  const tz = config.timezone;
  const inflight = new Map(); // referencia → promesa (doble clic contra la misma instancia)

  const minDate = () => T.addDays(T.todayIn(tz, now()), config.minDaysAhead);
  const maxMonth = () => T.addMonths(minDate().slice(0, 7), config.maxMonthsAhead);

  function resolvePackage(serviceSlug, packageSlug) {
    const found = findPackage(serviceSlug, packageSlug);
    if (!found) throw new BookingError('invalid', 'Servicio o paquete desconocido', { field: 'paquete' });
    return { ...found, event: eventFor(serviceSlug, packageSlug, events) };
  }

  // Horarios libres de Cal.com entre dos fechas locales (inclusive), en hora local.
  // Solo se devuelven horarios que Cal.com marcó como libres y que cumplen las reglas del sitio.
  async function freeSlots(event, fromDate, toDate) {
    const startUtc = T.localToUtc(fromDate, '00:00', tz).toISOString();
    const endUtc = new Date(T.localToUtc(T.addDays(toDate, 1), '00:00', tz).getTime() - 1).toISOString();
    const data = await cal.getSlots({ eventTypeId: event.eventTypeId, startUtc, endUtc, timeZone: tz });
    const min = minDate();
    const days = {};
    Object.values(data).forEach((list) => {
      if (!Array.isArray(list)) throw new CalApiError('invalid', 'Formato de horarios inesperado');
      list.forEach((slot) => {
        if (!slot || typeof slot.start !== 'string') throw new CalApiError('invalid', 'Horario sin inicio');
        // La fecha y hora locales se calculan desde el instante, no desde la clave del día
        const local = T.utcToLocal(slot.start, tz);
        if (slot.end) {
          const minutes = (Date.parse(slot.end) - Date.parse(slot.start)) / 6e4;
          if (minutes !== event.durationMinutes) {
            throw new CalApiError('invalid', `Duración ${minutes} min en Cal.com ≠ ${event.durationMinutes} min del mapeo (evento ${event.eventTypeId})`);
          }
        }
        if (local.date < fromDate || local.date > toDate || local.date < min) return;
        if (!config.workingDays.includes(local.weekday)) return;
        (days[local.date] = days[local.date] || new Set()).add(local.time);
      });
    });
    return Object.fromEntries(Object.keys(days).sort().map((d) => [d, [...days[d]].sort()]));
  }

  async function getAvailability({ servicio, paquete, mes }) {
    if (!T.isMonth(mes)) throw new BookingError('invalid', 'Mes inválido', { field: 'mes' });
    const { event } = resolvePackage(servicio, paquete);
    if (!event) return { reservable: false };
    const first = minDate().slice(0, 7);
    if (mes < first || mes > maxMonth()) return { reservable: true, duracionMinutos: event.durationMinutes, dias: {} };
    const dias = await freeSlots(event, `${mes}-01`, T.lastDayOfMonth(mes));
    return { reservable: true, duracionMinutos: event.durationMinutes, dias };
  }

  /* ---------- Validación de la solicitud ---------- */
  function validate(body) {
    if (!body || typeof body !== 'object') throw new BookingError('invalid', 'Cuerpo vacío');
    const fail = (field, msg) => { throw new BookingError('invalid', msg, { field }); };
    const str = (v) => (typeof v === 'string' ? v.trim() : '');

    const { service, pkg, event } = resolvePackage(str(body.servicio), str(body.paquete));
    if (!event) throw new BookingError('not_reservable', 'Este paquete se coordina por WhatsApp');

    const ref = str(body.referencia);
    if (!/^[A-Za-z0-9-]{16,64}$/.test(ref)) fail('referencia', 'Referencia inválida');

    const name = str(body.nombre).replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) fail('nombre', 'Nombre inválido');

    const phone = str(body.whatsapp);
    const code = config.countryCodes.find((c) => phone.startsWith(c));
    if (!code || !/^\d{10}$/.test(phone.slice(code.length))) fail('whatsapp', 'WhatsApp inválido');

    const date = str(body.fecha);
    const time = str(body.hora);
    if (!T.isIsoDate(date)) fail('fecha', 'Fecha inválida');
    if (!T.isTime(time)) fail('hora', 'Hora inválida');
    if (date < minDate() || date.slice(0, 7) > maxMonth()) fail('fecha', 'Fecha fuera del rango permitido');
    if (body.zonaHoraria !== undefined && body.zonaHoraria !== tz) fail('zonaHoraria', 'Zona horaria distinta');
    const startUtc = T.localToUtc(date, time, tz);
    if (!config.workingDays.includes(T.utcToLocal(startUtc.toISOString(), tz).weekday)) fail('fecha', 'Día sin sesiones');

    // El precio y el abono los fija el servidor; si el navegador muestra otros, se avisa.
    const price = pkg.price;
    const deposit = depositFor(price);
    if (Number(body.precio) !== price || Number(body.abono) !== deposit) {
      throw new BookingError('price_changed', 'El precio cambió', { precio: price, abono: deposit });
    }

    const details = body.detalles === undefined ? {} : body.detalles;
    if (!details || typeof details !== 'object' || Array.isArray(details)) fail('detalles', 'Detalles inválidos');
    const entries = Object.entries(details);
    if (entries.length > 20) fail('detalles', 'Demasiados detalles');
    entries.forEach(([k, v]) => {
      if (typeof v !== 'string' && typeof v !== 'number') fail('detalles', 'Detalle inválido');
      if (k.length > 60 || String(v).length > 500) fail('detalles', 'Detalle demasiado largo');
    });

    return { service, pkg, event, ref, name, phone, date, time, startUtc, price, deposit, details: entries };
  }

  const detailText = (entries) => entries.map(([k, v]) => `${k}: ${String(v).trim()}`).join(' · ').slice(0, 500);

  function calInput(v) {
    return {
      start: v.startUtc.toISOString(),
      eventTypeId: v.event.eventTypeId,
      // Sin correo: el evento lo tiene oculto y el sitio no lo pide.
      attendee: { name: v.name, timeZone: tz, phoneNumber: v.phone, language: 'es' },
      // Metadata de Cal.com: máx. 50 claves, claves ≤ 40 caracteres, valores string ≤ 500.
      metadata: {
        ref: v.ref,
        origen: SOURCE,
        servicio: v.service.slug,
        paquete: v.pkg.slug,
        precioUSD: String(v.price),
        abonoUSD: String(v.deposit),
        whatsapp: v.phone,
        creadaEn: new Date(now()).toISOString(),
        venceEn: new Date(now() + EXPIRY_HOURS * HOUR).toISOString(),
        detalles: detailText(v.details),
      },
    };
  }

  const ACTIVE = new Set(['pending', 'accepted']);
  const bookingEventId = (b) => (b.eventType && b.eventType.id) || b.eventTypeId;

  // Busca en Cal.com una reserva ya creada con esta referencia (reintentos y respuestas inciertas)
  async function findByRef(v) {
    const end = new Date(v.startUtc.getTime() + v.event.durationMinutes * 6e4);
    const list = await cal.listBookings({
      eventTypeId: v.event.eventTypeId,
      afterStart: new Date(v.startUtc.getTime() - 6e4).toISOString(),
      beforeEnd: new Date(end.getTime() + 6e4).toISOString(),
    });
    return list.find((b) => b && b.metadata && b.metadata.ref === v.ref && b.metadata.whatsapp === v.phone && ACTIVE.has(b.status)) || null;
  }

  // Comprueba que el identificador devuelto existe en Cal.com y corresponde a esta solicitud
  async function verify(created, v) {
    if (!created || typeof created.uid !== 'string' || !created.uid) {
      throw new BookingError('verification_failed', 'Cal.com no devolvió un identificador de reserva');
    }
    let fresh = created;
    try {
      fresh = await cal.getBooking(created.uid);
    } catch (err) {
      // La creación respondió 201 con uid: la reserva existe aunque la relectura falle.
      log.warn(`[reservas] No se pudo releer ${created.uid}: ${err.message}`);
    }
    const problems = [];
    if (fresh.uid !== created.uid) problems.push('uid');
    if (Date.parse(fresh.start) !== v.startUtc.getTime()) problems.push('inicio');
    if (Number(bookingEventId(fresh)) !== v.event.eventTypeId) problems.push('evento');
    if (fresh.metadata && fresh.metadata.ref !== undefined && fresh.metadata.ref !== v.ref) problems.push('referencia');
    if (!ACTIVE.has(fresh.status)) problems.push(`estado ${fresh.status}`);
    if (problems.length) {
      log.error(`[reservas] Reserva ${created.uid} no coincide con la solicitud ${v.ref}: ${problems.join(', ')}`);
      throw new BookingError('verification_failed', 'La reserva creada no coincide con la solicitud', { uid: created.uid });
    }
    if (fresh.status === 'accepted') log.warn(`[reservas] ${fresh.uid} quedó aceptada sin aprobación manual: revisa el evento ${v.event.eventTypeId}`);
    return fresh;
  }

  const result = (b, v, reused) => ({
    referencia: b.uid,
    uid: b.uid,
    estado: b.status === 'accepted' ? 'confirmada' : 'pendiente',
    fecha: v.date,
    hora: v.time,
    precio: v.price,
    abono: v.deposit,
    reutilizada: reused,
  });

  async function doCreate(v) {
    const existing = await findByRef(v);
    if (existing) return result(existing, v, true);

    // Solo se reservan horarios que Cal.com devuelve como libres en este momento
    const free = await freeSlots(v.event, v.date, v.date);
    if (!(free[v.date] || []).includes(v.time)) throw new BookingError('slot_taken', 'Horario no disponible');

    let created;
    try {
      created = await cal.createBooking(calInput(v));
    } catch (err) {
      if (!(err instanceof CalApiError)) throw err;
      if (err.kind === 'conflict' || err.uncertain) {
        // Pudo crearse en un intento anterior o en este mismo (respuesta perdida)
        const again = await findByRef(v).catch(() => null);
        if (again) return result(again, v, true);
        if (err.kind === 'conflict') throw new BookingError('slot_taken', 'Horario no disponible');
        throw new BookingError('uncertain', 'No se pudo confirmar si la reserva se creó');
      }
      throw err;
    }
    const verified = await verify(created, v);
    return result(verified, v, false);
  }

  async function createBooking(body) {
    const v = validate(body);
    if (inflight.has(v.ref)) return inflight.get(v.ref);
    const p = doCreate(v).finally(() => inflight.delete(v.ref));
    inflight.set(v.ref, p);
    return p;
  }

  /* ---------- Vencimiento de solicitudes pendientes ---------- */
  // mode: 'off' | 'dry-run' | 'on'. paymentReviewRule: regla para abonos pagados pero sin revisar.
  // Sin regla definida, 'on' no se permite en producción (ver README).
  async function expirePending({ mode = 'off', production = false, paymentReviewRule = null } = {}) {
    const report = { mode, revisadas: 0, vencidas: [], omitidas: [], errores: [] };
    if (mode === 'off') return report;
    if (mode !== 'dry-run' && mode !== 'on') throw new BookingError('invalid', `EXPIRATION_MODE desconocido: ${mode}`);
    if (mode === 'on' && production && !paymentReviewRule) {
      throw new BookingError('blocked', 'Caducidad bloqueada en producción: falta definir la regla para abonos pendientes de revisión');
    }
    const ids = [...new Set(Object.values(events).map((e) => e.eventTypeId))];
    if (!ids.length) return report;

    const pending = await cal.listBookings({ eventTypeIds: ids.join(','), status: 'unconfirmed' });
    const t = now();
    for (const b of pending) {
      const meta = b.metadata || {};
      if (meta.origen !== SOURCE || !meta.ref) { report.omitidas.push({ uid: b.uid, motivo: 'no creada por el sitio' }); continue; }
      report.revisadas += 1;
      const due = Date.parse(meta.venceEn) || (Date.parse(b.createdAt) + EXPIRY_HOURS * HOUR);
      if (!(due <= t)) { report.omitidas.push({ uid: b.uid, motivo: 'dentro del plazo' }); continue; }
      try {
        // Estado vigente justo antes de actuar: nunca rechazar una reserva ya confirmada
        const fresh = await cal.getBooking(b.uid);
        if (fresh.status !== 'pending') { report.omitidas.push({ uid: b.uid, motivo: `estado actual ${fresh.status}` }); continue; }
        if (paymentReviewRule && paymentReviewRule(fresh) === 'keep') { report.omitidas.push({ uid: b.uid, motivo: 'abono en revisión' }); continue; }
        if (mode === 'dry-run') { report.vencidas.push({ uid: b.uid, simulada: true }); continue; }
        await cal.declineBooking(b.uid, 'Solicitud vencida: no se recibió el abono del 50% en 24 horas.');
        report.vencidas.push({ uid: b.uid });
      } catch (err) {
        report.errores.push({ uid: b.uid, error: err.message });
      }
    }
    return report;
  }

  return { getAvailability, createBooking, expirePending, validate, minDate, maxMonth };
}

module.exports = { createBookingService, BookingError, SOURCE, EXPIRY_HOURS };
