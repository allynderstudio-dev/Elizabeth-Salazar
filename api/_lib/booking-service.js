// Lógica de reservas, sin dependencias de HTTP (los handlers de api/ la envuelven).
// Cal.com es la única fuente de verdad: no hay base de datos. Los datos propios de cada
// solicitud (referencia, precio, abono, fecha de creación) viajan en el metadata de la reserva.
//
// Sin dobles reservas (BR-06): la comprobación final y la creación forman una sección crítica
// con un bloqueo por FECHA en un almacén compartido (api/_lib/store.js), así dos instancias
// nunca crean a la vez para el mismo día. Dentro del bloqueo:
//   1. ¿ya existe una reserva con esta referencia? (reintentos)
//   2. ¿hay una reserva activa (pendiente o aceptada) que se solape, de cualquier paquete?
//   3. ¿Cal.com sigue devolviendo el horario como libre? (ve también los bloqueos manuales
//      de Ely en su Google Calendar)
//   4. crear y releer el uid
// El rechazo de Cal.com ante un choque queda como segunda línea de defensa.
//
// Las solicitudes pendientes NUNCA vencen solas (BR-03): Ely las confirma, rechaza o cancela
// en Cal.com. Este módulo no tiene ninguna ruta que rechace o cancele reservas.
const crypto = require('node:crypto');
const { CalApiError } = require('./cal-client.js');
const { BOOKING_DATA, BOOKING_CONFIG, CAL_EVENTS, findPackage, eventFor, depositFor } = require('./catalog.js');
const { createMemoryStore } = require('./store.js');
const T = require('./time.js');

const HOUR = 36e5;

// Respuestas del formulario de Cal.com que se envían con cada reserva (identificadores de sus
// preguntas). Así el calendario muestra de qué trata la sesión:
//   notes    "Notas adicionales" (pregunta que trae todo evento): resumen de servicio, precio y detalles.
//            Cal.com la muestra en la reserva y en la descripción del evento de Google Calendar.
//   service  pregunta propia de texto corto (p. ej. identificador "servicio") con "Embarazo · Estudio",
//            para usarla en el nombre del evento. null = no se envía (la pregunta aún no existe).
const BOOKING_FIELDS = { notes: 'notes', service: null };
const REVIEW_AFTER_HOURS = 24; // recordatorio para Ely (BR-15); nunca cambia el estado
const SOURCE = 'web-ely';
// Bloqueo de la sección crítica: TTL > duración máxima esperada (cada llamada a Cal.com tiene
// un tiempo límite de 12 s). Si una instancia se cae, el bloqueo caduca solo.
// Tras un resultado incierto, el bloqueo se mantiene uncertainHoldMs para que Cal.com muestre
// la reserva (si llegó a crearse) antes de que otra solicitud compruebe ese día.
const LOCK = { ttlMs: 45000, waitMs: 8000, startCreateBeforeMs: 30000, uncertainHoldMs: 5000 };

// Errores que el handler traduce a respuestas HTTP
class BookingError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    Object.assign(this, extra);
  }
}

// store: almacén compartido (undefined → memoria, para pruebas; null → sin almacén: no reserva).
// canWrite: false fuera de producción sin cuenta de prueba aislada (api/_lib/environment.js).
function createBookingService({
  cal, events = CAL_EVENTS, config = BOOKING_CONFIG, fields = BOOKING_FIELDS, now = () => Date.now(), log = console,
  store = createMemoryStore(), canWrite = true, lockPrefix = 'ely-reservas', lock = LOCK,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const tz = config.timezone;
  const inflight = new Map(); // referencia → promesa (doble clic contra la misma instancia)
  const online = canWrite && Boolean(store);
  const siteEventIds = [...new Set(Object.values(events).map((e) => e.eventTypeId))];

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
    // motivo: 'sin_evento' (paquete sin Cal.com) o 'reservas_desactivadas' (sin escritura o sin
    // almacén compartido: el sitio pasa a modo WhatsApp y no aparta nada; ver npm run live:check)
    if (!event || !online) return { reservable: false, motivo: event ? 'reservas_desactivadas' : 'sin_evento' };
    const first = minDate().slice(0, 7);
    if (mes < first || mes > maxMonth()) return { reservable: true, duracionMinutos: event.durationMinutes, dias: {} };
    const from = `${mes}-01`;
    const to = T.lastDayOfMonth(mes);
    const [free, active] = await Promise.all([freeSlots(event, from, to), activeBookings(from, to)]);
    // Se descuentan las reservas activas de CUALQUIER paquete: no depende de que /v2/slots
    // oculte las pendientes (solo está verificado para las aceptadas)
    const dias = {};
    Object.entries(free).forEach(([date, times]) => {
      const left = times.filter((time) => {
        const start = T.localToUtc(date, time, tz).getTime();
        return !active.some((b) => collides(b, start, start + event.durationMinutes * 6e4));
      });
      if (left.length) dias[date] = left;
    });
    return { reservable: true, duracionMinutos: event.durationMinutes, dias };
  }

  /* ---------- Validación de la solicitud ---------- */
  function validate(body) {
    if (!body || typeof body !== 'object') throw new BookingError('invalid', 'Cuerpo vacío');
    const fail = (field, msg) => { throw new BookingError('invalid', msg, { field }); };
    const str = (v) => (typeof v === 'string' ? v.trim() : '');

    const { service, pkg, event } = resolvePackage(str(body.servicio), str(body.paquete));
    // Sin escritura permitida o sin almacén compartido: se rechaza antes de llamar a Cal.com
    if (!event || !online) throw new BookingError('not_reservable', 'Este paquete se coordina por WhatsApp');

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

    // Newborn: solo con el bebé ya nacido y hasta los 3 meses el día de la sesión (BR-08)
    let birth = null;
    if (service.requiresBirth) {
      birth = str(body.nacimiento);
      const status = BOOKING_DATA.newbornEligibility({ born: body.nacio, birth, session: date, today: T.todayIn(tz, now()) });
      if (status === 'unborn') fail('nacio', 'Las sesiones Newborn se reservan cuando el bebé ya nació');
      if (status !== 'ok') fail('nacimiento', status === 'too_old' ? 'El bebé tendrá 4 meses o más el día de la sesión' : 'Fecha de nacimiento inválida');
    }

    // Cantidad de bebés: solo en servicios con regla de bebés (Newborn), y cambia el precio
    const rule = service.babies;
    if (rule) {
      const n = body.bebes;
      if (!Number.isInteger(n) || n < rule.min || n > rule.max) fail('bebes', 'Cantidad de bebés inválida');
    }
    const quote = BOOKING_DATA.quote(service, pkg, rule ? body.bebes : undefined);

    // El precio y el abono los fija el servidor; si el navegador muestra otros, se avisa.
    const price = quote.total;
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

    return { service, pkg, event, ref, name, phone, date, time, startUtc, quote, price, deposit, birth, details: entries };
  }

  const detailText = (entries) => entries.map(([k, v]) => `${k}: ${String(v).trim()}`).join(' · ').slice(0, 500);
  const serviceLabel = (v) => `${v.service.name} · ${v.pkg.name}`;
  const money = (n) => `US$${n}`;
  // "Bebés: 2 (paquete US$80 + bebé adicional US$20)"
  const babiesText = (q) =>
    `Bebés: ${q.babies} (paquete ${money(q.base)} + ${q.extra === 1 ? 'bebé adicional' : `${q.extra} bebés adicionales`} ${money(q.surcharge)})`;

  // Resumen legible para Ely en la reserva y en Google Calendar
  function notesText(v) {
    const lines = [`${serviceLabel(v)} — ${money(v.price)} (abono del 50%: ${money(v.deposit)})`];
    if (v.quote.surcharge) lines.push(babiesText(v.quote));
    v.details.forEach(([k, val]) => lines.push(`${k}: ${String(val).trim()}`));
    lines.push(`WhatsApp: ${v.phone}`, 'Solicitud enviada desde la página web.');
    return lines.join('\n').slice(0, 1500);
  }

  function bookingFieldsResponses(v) {
    const out = {};
    if (fields.notes) out[fields.notes] = notesText(v);
    if (fields.service) out[fields.service] = serviceLabel(v);
    return out;
  }

  function calInput(v) {
    return {
      start: v.startUtc.toISOString(),
      eventTypeId: v.event.eventTypeId,
      // Sin correo: el evento lo tiene oculto y el sitio no lo pide.
      attendee: { name: v.name, timeZone: tz, phoneNumber: v.phone, language: 'es' },
      bookingFieldsResponses: bookingFieldsResponses(v),
      // Metadata de Cal.com: máx. 50 claves, claves ≤ 40 caracteres, valores string ≤ 500.
      metadata: {
        ref: v.ref,
        origen: SOURCE,
        servicio: v.service.slug,
        paquete: v.pkg.slug,
        precioUSD: String(v.price),
        abonoUSD: String(v.deposit),
        ...(v.quote.babies ? { bebes: String(v.quote.babies), recargoUSD: String(v.quote.surcharge) } : {}),
        whatsapp: v.phone,
        creadaEn: new Date(now()).toISOString(),
        ...(v.birth ? { nacimiento: v.birth } : {}),
        detalles: detailText(v.details),
      },
    };
  }

  const ACTIVE = new Set(['pending', 'accepted']);
  const bookingEventId = (b) => (b.eventType && b.eventType.id) || b.eventTypeId;

  // Reservas activas (pendientes o aceptadas) que cumplen los filtros. Se piden también las
  // 'unconfirmed' por separado: que la lista sin filtro de estado incluya las pendientes no está
  // verificado contra la API real (T-DB-12), y así no depende de ello.
  async function listActive(filters) {
    const lists = await Promise.all([cal.listBookings(filters), cal.listBookings({ ...filters, status: 'unconfirmed' })]);
    const byUid = new Map();
    lists.flat().forEach((b) => { if (b && ACTIVE.has(b.status)) byUid.set(b.uid, b); });
    return [...byUid.values()];
  }

  // Reservas activas de todos los eventos del sitio entre dos fechas locales (inclusive)
  const activeBookings = (fromDate, toDate) => listActive({
    eventTypeIds: siteEventIds.join(','),
    afterStart: T.localToUtc(fromDate, '00:00', tz).toISOString(),
    beforeEnd: T.localToUtc(T.addDays(toDate, 1), '00:00', tz).toISOString(),
  });
  const collides = (b, start, end) => Date.parse(b.start) < end && start < Date.parse(b.end);

  // Busca en Cal.com una reserva ya creada con esta referencia (reintentos y respuestas inciertas)
  async function findByRef(v) {
    const end = new Date(v.startUtc.getTime() + v.event.durationMinutes * 6e4);
    const list = await listActive({
      eventTypeId: v.event.eventTypeId,
      afterStart: new Date(v.startUtc.getTime() - 6e4).toISOString(),
      beforeEnd: new Date(end.getTime() + 6e4).toISOString(),
    });
    return list.find((b) => b.metadata && b.metadata.ref === v.ref && b.metadata.whatsapp === v.phone) || null;
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

  /* ---------- Sección crítica entre instancias ---------- */
  // Un bloqueo por fecha: los bloques de 2 h no se solapan entre días, y serializar el día
  // cubre cualquier solapamiento entre paquetes. Si no se obtiene a tiempo → 'busy' (reintentable).
  async function withDayLock(date, fn) {
    const key = `${lockPrefix}:lock:${date}`;
    const token = crypto.randomUUID();
    const started = Date.now();
    for (;;) {
      let got;
      try {
        got = await store.setNx(key, token, lock.ttlMs);
      } catch (err) {
        log.error(`[reservas] Almacén no disponible: ${err.message}`);
        throw new BookingError('busy', 'No se pudo obtener el bloqueo');
      }
      if (got) break;
      if (Date.now() - started > lock.waitMs) throw new BookingError('busy', 'Otra solicitud para ese día está en curso');
      await sleep(150 + Math.floor(Math.random() * 150));
    }
    let keep = false;
    try {
      return await fn({ acquiredAt: Date.now(), keepLock: () => { keep = true; } });
    } finally {
      const done = keep ? store.expireIfEquals(key, token, lock.uncertainHoldMs) : store.delIfEquals(key, token);
      await done.catch((err) => log.warn(`[reservas] No se liberó el bloqueo: ${err.message}`));
    }
  }

  // Reservas activas (pendientes o aceptadas) de cualquier paquete del sitio que se solapen
  // con el bloque pedido. Las rechazadas y canceladas no cuentan.
  async function overlapping(v) {
    const start = v.startUtc.getTime();
    const end = start + v.event.durationMinutes * 6e4;
    return (await activeBookings(v.date, v.date)).filter((b) => collides(b, start, end));
  }

  async function doCreate(v) {
    const existing = await findByRef(v);
    if (existing) return result(existing, v, true);

    return withDayLock(v.date, async ({ acquiredAt, keepLock }) => {
      // 1. Otra instancia pudo crearla con esta referencia mientras se esperaba el bloqueo
      const again = await findByRef(v);
      if (again) return result(again, v, true);
      // 2. Ninguna reserva activa de ningún paquete ocupa ese bloque
      if ((await overlapping(v)).length) throw new BookingError('slot_taken', 'Horario no disponible');
      // 3. Cal.com sigue ofreciéndolo (incluye bloqueos manuales del calendario conectado)
      const free = await freeSlots(v.event, v.date, v.date);
      if (!(free[v.date] || []).includes(v.time)) throw new BookingError('slot_taken', 'Horario no disponible');
      // Sin margen para crear antes de que caduque el bloqueo: mejor reintentar
      if (Date.now() - acquiredAt > lock.startCreateBeforeMs) throw new BookingError('busy', 'La comprobación tardó demasiado');

      // 4. Crear
      let created;
      try {
        created = await cal.createBooking(calInput(v));
      } catch (err) {
        if (!(err instanceof CalApiError)) throw err;
        if (err.kind === 'conflict' || err.uncertain) {
          // Pudo crearse en un intento anterior o en este mismo (respuesta perdida)
          const found = await findByRef(v).catch(() => null);
          if (found) return result(found, v, true);
          if (err.kind === 'conflict') throw new BookingError('slot_taken', 'Horario no disponible');
          keepLock();
          throw new BookingError('uncertain', 'No se pudo confirmar si la reserva se creó');
        }
        throw err;
      }
      const verified = await verify(created, v);
      return result(verified, v, false);
    });
  }

  async function createBooking(body) {
    const v = validate(body);
    if (inflight.has(v.ref)) return inflight.get(v.ref);
    const p = doCreate(v).finally(() => inflight.delete(v.ref));
    inflight.set(v.ref, p);
    return p;
  }

  /* ---------- Recordatorio para Ely (BR-15) ---------- */
  // Solo lectura: solicitudes creadas por el sitio, aún pendientes y con 24 h o más.
  // No hay ninguna llamada que confirme, rechace o cancele: Ely decide en Cal.com.
  async function pendingForReview({ minAgeHours = REVIEW_AFTER_HOURS } = {}) {
    if (!siteEventIds.length) return [];
    const list = await cal.listBookings({ eventTypeIds: siteEventIds.join(','), status: 'unconfirmed' });
    const t = now();
    return list
      .filter((b) => b && b.status === 'pending' && (b.metadata || {}).origen === SOURCE)
      .map((b) => {
        const meta = b.metadata || {};
        const created = Date.parse(meta.creadaEn) || Date.parse(b.createdAt);
        const local = T.utcToLocal(b.start, tz);
        return {
          uid: b.uid,
          creadaEn: new Date(created).toISOString(),
          horasDesdeSolicitud: Math.floor((t - created) / HOUR),
          fecha: local.date,
          hora: local.time,
          nombre: (b.attendees && b.attendees[0] && b.attendees[0].name) || '',
          whatsapp: meta.whatsapp || '',
          servicio: meta.servicio || '',
          paquete: meta.paquete || '',
          abonoUSD: meta.abonoUSD || '',
        };
      })
      .filter((r) => r.horasDesdeSolicitud >= minAgeHours)
      .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));
  }

  return { getAvailability, createBooking, pendingForReview, validate, minDate, maxMonth, mode: online ? 'online' : 'whatsapp' };
}

module.exports = { createBookingService, BookingError, SOURCE, REVIEW_AFTER_HOURS, BOOKING_FIELDS, LOCK };
