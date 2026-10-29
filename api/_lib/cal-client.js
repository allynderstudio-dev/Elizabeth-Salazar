// Cliente mínimo de Cal.com API v2. Solo corre en el servidor: usa CAL_API_KEY.
// Versiones por endpoint según la documentación oficial (cal.com/docs/api-reference/v2):
//   GET  /v2/slots                         cal-api-version 2024-09-04
//   POST /v2/bookings                      cal-api-version 2026-02-25
//   GET  /v2/bookings/{uid}                cal-api-version 2026-02-25
//   GET  /v2/bookings (lista, por cursor)  cal-api-version 2026-05-01
//   GET  /v2/me                            (solo para comprobar a qué cuenta llega una clave)
// No hay llamadas para confirmar, rechazar ni cancelar: eso lo hace Ely en Cal.com.
// Cal.com no documenta idempotencia en POST /v2/bookings: los duplicados se evitan en
// api/_lib/booking-service.js con una referencia propia guardada en metadata.
const VERSIONS = {
  slots: '2024-09-04',
  booking: '2026-02-25',
  bookingsList: '2026-05-01',
};

const DEFAULT_BASE = 'https://api.cal.com';
const DEFAULT_TIMEOUT_MS = 12000;

// kind:
//   'network'  sin respuesta (caída, DNS, tiempo agotado): resultado DESCONOCIDO
//   'server'   5xx: resultado DESCONOCIDO en escrituras
//   'auth'     401/403: clave inválida o sin permisos
//   'conflict' horario ocupado o no disponible
//   'rate'     429
//   'rejected' otro 4xx (datos que Cal.com no acepta)
//   'invalid'  respuesta 2xx con forma inesperada
class CalApiError extends Error {
  constructor(kind, message, { status = null, body = null } = {}) {
    super(message);
    this.name = 'CalApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }

  // ¿Pudo haberse aplicado la escritura aunque falló?
  get uncertain() { return this.kind === 'network' || this.kind === 'server'; }
}

// Cal.com no documenta un código específico para "horario ocupado"; se reconoce por estado y mensaje.
const CONFLICT_PATTERN = /already has booking|not available|no available|unavailable|conflict|booking limit/i;

function classify(status, body) {
  const message = body && (body.error?.message || body.message || (typeof body.error === 'string' ? body.error : '')) || '';
  if (status === 401 || status === 403) return new CalApiError('auth', `Cal.com rechazó las credenciales (${status})`, { status, body });
  if (status === 429) return new CalApiError('rate', 'Cal.com limitó las solicitudes (429)', { status, body });
  if (status >= 500) return new CalApiError('server', `Cal.com respondió ${status}`, { status, body });
  if (status === 409 || (status === 400 && CONFLICT_PATTERN.test(String(message)))) {
    return new CalApiError('conflict', `Horario no disponible: ${message || status}`, { status, body });
  }
  return new CalApiError('rejected', `Cal.com rechazó la solicitud (${status}): ${message}`, { status, body });
}

// allowWrites: false → createBooking falla antes de llamar a Cal.com (segunda barrera, ver environment.js)
function createCalClient({ apiKey, baseUrl = DEFAULT_BASE, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS, allowWrites = true } = {}) {
  async function request(method, path, { version, query, body } = {}) {
    // Se comprueba al usarla: los paquetes sin evento de Cal.com funcionan sin clave
    if (!apiKey) throw new CalApiError('auth', 'Falta CAL_API_KEY en el servidor');
    const url = new URL(path, baseUrl);
    Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
    let res;
    try {
      res = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(version ? { 'cal-api-version': version } : {}),
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new CalApiError('network', `Sin respuesta de Cal.com: ${err.message}`);
    }
    let json = null;
    const text = await res.text().catch(() => '');
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
    if (!res.ok) throw classify(res.status, json);
    if (!json || json.status !== 'success') throw new CalApiError('invalid', `Respuesta inesperada de Cal.com en ${path}`, { status: res.status, body: json });
    return json;
  }

  return {
    // → { 'AAAA-MM-DD': [{ start, end }] } con horas en la zona pedida
    async getSlots({ eventTypeId, startUtc, endUtc, timeZone, duration }) {
      const json = await request('GET', '/v2/slots', {
        version: VERSIONS.slots,
        query: { eventTypeId, start: startUtc, end: endUtc, timeZone, duration, format: 'range' },
      });
      if (typeof json.data !== 'object' || Array.isArray(json.data)) throw new CalApiError('invalid', 'Formato de horarios inesperado', { body: json });
      return json.data;
    },

    async createBooking(input) {
      if (!allowWrites) throw new CalApiError('auth', 'Escritura en Cal.com desactivada en este entorno');
      const json = await request('POST', '/v2/bookings', { version: VERSIONS.booking, body: input });
      return json.data;
    },

    async getBooking(uid) {
      const json = await request('GET', `/v2/bookings/${encodeURIComponent(uid)}`, { version: VERSIONS.booking });
      return json.data;
    },

    // Cuenta a la que llega la clave (solo lectura)
    async getMe() {
      const json = await request('GET', '/v2/me');
      return json.data;
    },

    // Recorre todas las páginas (cursor). filters: eventTypeIds, status, afterStart, beforeEnd…
    async listBookings(filters = {}, { maxPages = 20 } = {}) {
      const out = [];
      let cursor;
      for (let page = 0; page < maxPages; page += 1) {
        const json = await request('GET', '/v2/bookings', {
          version: VERSIONS.bookingsList,
          query: { ...filters, limit: 100, cursor },
        });
        if (!Array.isArray(json.data)) throw new CalApiError('invalid', 'Formato de lista de reservas inesperado', { body: json });
        out.push(...json.data);
        const next = json.pagination && json.pagination.nextCursor;
        if (!next || !json.pagination.hasMore) return out;
        cursor = next;
      }
      throw new CalApiError('invalid', 'Demasiadas páginas de reservas');
    },
  };
}

module.exports = { createCalClient, CalApiError, VERSIONS };
