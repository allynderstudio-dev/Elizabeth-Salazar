// Cal.com simulado a nivel HTTP (fetch) para pruebas aisladas. Reproduce lo documentado
// de la API v2 y lo configurado en la cuenta (aprobación manual, pendientes que bloquean,
// lunes a sábado, inicios 08/10/14/16 en Caracas). NO sustituye las pruebas reales.
const CARACAS = '-04:00'; // Venezuela no usa horario de verano desde 2016
const STARTS = ['08:00', '10:00', '14:00', '16:00'];
const VERSIONS = { slots: '2024-09-04', booking: '2026-02-25', list: '2026-05-01' };

// enforce: false → Cal.com NO rechaza choques ni descuenta reservas de /v2/slots (peor caso:
// prueba que lo que evita duplicados es el sitio, no Cal.com). calendarBusy: bloqueos manuales
// del calendario conectado [{ start, end }] que /v2/slots descuenta (BR-16).
function createFakeCal({ events, now = () => Date.parse('2026-11-02T12:00:00Z'), apiKey = 'cal_test_key', pageSize = 100, enforce = true, latencyMs = 0 } = {}) {
  const calendarBusy = [];
  const bookings = [];
  const calls = [];
  const faults = [];
  let seq = 0;

  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const error = (status, message) => json(status, { status: 'error', error: { message } });
  const blocks = (b) => b.status === 'pending' || b.status === 'accepted';
  const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;
  const busy = (start, end) => enforce && bookings.some((b) => blocks(b) && overlaps(start, end, Date.parse(b.start), Date.parse(b.end)));
  const manual = (start, end) => calendarBusy.some((c) => overlaps(start, end, Date.parse(c.start), Date.parse(c.end)));

  // Falla inyectada: { method, path (regex), kind: 'network' | 'commit-then-network' | 'override' | status, once, skip }
  function inject(fault) { faults.push({ once: true, ...fault }); }
  function takeFault(method, path) {
    const i = faults.findIndex((f) => f.method === method && f.path.test(path));
    if (i < 0) return null;
    const f = faults[i];
    if (f.skip > 0) { f.skip -= 1; return null; } // deja pasar las primeras llamadas
    if (f.once) faults.splice(i, 1);
    return f;
  }

  function slots(q) {
    const ev = events[q.get('eventTypeId')];
    if (!ev) return error(404, 'Event type not found');
    const from = Date.parse(q.get('start'));
    const to = Date.parse(q.get('end'));
    const data = {};
    for (let day = Date.parse(new Date(from).toISOString().slice(0, 10) + 'T00:00:00Z') - 864e5; day <= to + 864e5; day += 864e5) {
      const date = new Date(day).toISOString().slice(0, 10);
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (dow === 0) continue;
      STARTS.forEach((t) => {
        const start = Date.parse(`${date}T${t}:00${CARACAS}`);
        const end = start + ev.duration * 6e4;
        if (start < from || start > to || start <= now() || busy(start, end) || manual(start, end)) return;
        const fmt = (ms) => `${new Date(ms - 4 * 36e5).toISOString().slice(0, 19)}.000${CARACAS}`;
        (data[date] = data[date] || []).push({ start: fmt(start), end: fmt(end) });
      });
    }
    return json(200, { status: 'success', data });
  }

  function create(body) {
    const ev = events[body.eventTypeId];
    if (!ev) return error(400, 'Event type not found');
    if (!body.attendee || !body.attendee.name || !body.attendee.timeZone) return error(400, 'attendee.name and attendee.timeZone are required');
    if (!/Z$/.test(body.start)) return error(400, 'start must be in UTC');
    const start = Date.parse(body.start);
    const end = start + ev.duration * 6e4;
    if (busy(start, end)) return error(400, 'User either already has booking at this time or is not available');
    seq += 1;
    const b = {
      id: seq, uid: `uid${String(seq).padStart(4, '0')}abcdefghij`, title: 'Sesión', status: 'pending',
      start: new Date(start).toISOString(), end: new Date(end).toISOString(), duration: ev.duration,
      eventTypeId: Number(body.eventTypeId), eventType: { id: Number(body.eventTypeId), slug: `ev-${body.eventTypeId}` },
      attendees: [{ name: body.attendee.name, timeZone: body.attendee.timeZone, phoneNumber: body.attendee.phoneNumber, ...(body.attendee.email ? { email: body.attendee.email } : {}) }],
      metadata: { ...(body.metadata || {}) },
      bookingFieldsResponses: { name: body.attendee.name, attendeePhoneNumber: body.attendee.phoneNumber, ...(body.bookingFieldsResponses || {}) },
      createdAt: new Date(now()).toISOString(), updatedAt: null,
    };
    bookings.push(b);
    return b;
  }

  function list(q) {
    let out = bookings.slice();
    if (q.get('eventTypeId')) out = out.filter((b) => b.eventTypeId === Number(q.get('eventTypeId')));
    if (q.get('eventTypeIds')) { const ids = q.get('eventTypeIds').split(',').map(Number); out = out.filter((b) => ids.includes(b.eventTypeId)); }
    if (q.get('status') === 'unconfirmed') out = out.filter((b) => b.status === 'pending' && Date.parse(b.end) > now());
    if (q.get('afterStart')) out = out.filter((b) => Date.parse(b.start) >= Date.parse(q.get('afterStart')));
    if (q.get('beforeEnd')) out = out.filter((b) => Date.parse(b.end) <= Date.parse(q.get('beforeEnd')));
    const offset = Number(q.get('cursor') || 0);
    const page = out.slice(offset, offset + Math.min(pageSize, Number(q.get('limit') || 50)));
    const next = offset + page.length;
    return json(200, { status: 'success', data: page, pagination: { hasMore: next < out.length, nextCursor: next < out.length ? String(next) : null } });
  }

  // Cambios que hace Ely en Cal.com (aceptar, rechazar, cancelar)
  function setStatus(uid, status) {
    const b = bookings.find((x) => x.uid === uid);
    if (!b) throw new Error(`Reserva desconocida ${uid}`);
    b.status = status;
  }

  async function fetch(input, init = {}) {
    if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
    const url = new URL(String(input));
    const method = init.method || 'GET';
    const headers = init.headers || {};
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), headers, body });

    const fault = takeFault(method, url.pathname);
    if (fault && fault.kind === 'network') throw new TypeError('fetch failed');
    if (fault && typeof fault.kind === 'number') return error(fault.kind, 'Injected failure');

    if (headers.Authorization !== `Bearer ${apiKey}`) return error(401, 'Invalid API key');
    const version = headers['cal-api-version'];
    const p = url.pathname;

    if (method === 'GET' && p === '/v2/slots') {
      if (version !== VERSIONS.slots) return error(400, 'Wrong cal-api-version');
      return slots(url.searchParams);
    }
    if (method === 'POST' && p === '/v2/bookings') {
      if (version !== VERSIONS.booking) return error(400, 'Wrong cal-api-version');
      const res = create(body);
      if (res instanceof Response) return res;
      if (fault && fault.kind === 'commit-then-network') throw new TypeError('fetch failed after commit');
      return json(201, { status: 'success', data: res });
    }
    if (method === 'GET' && p === '/v2/bookings') {
      if (version !== VERSIONS.list) return error(400, 'Wrong cal-api-version');
      return list(url.searchParams);
    }
    const m = p.match(/^\/v2\/bookings\/([^/]+)(\/decline)?$/);
    if (m) {
      if (version !== VERSIONS.booking) return error(400, 'Wrong cal-api-version');
      const b = bookings.find((x) => x.uid === decodeURIComponent(m[1]));
      if (!b) return error(404, 'Booking not found');
      if (method === 'GET' && !m[2]) return json(200, { status: 'success', data: { ...b, ...(fault && fault.override) } });
      if (method === 'POST' && m[2]) {
        if (b.status !== 'pending') return error(400, 'Booking is not pending');
        b.status = 'rejected';
        b.rejectionReason = body && body.reason;
        return json(200, { status: 'success', data: b });
      }
    }
    return error(404, 'Not found');
  }

  return { fetch, bookings, calls, inject, apiKey, setStatus, calendarBusy };
}

module.exports = { createFakeCal };
